import { readFileSync } from 'fs';

import { debugServer } from './globals';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { CookieOptions } from 'express';
import session from 'express-session';
import { SessionOptions } from 'express-session';

import http from 'http';
import { Server as SocketServer } from 'socket.io';

import bcrypt from 'bcryptjs';
import pgConnect from 'connect-pg-simple';

import { Response } from 'express-serve-static-core';
import { ClientToServerEvents, ServerToClientEvents, User } from '../shared/types';
import { db } from './db';
import syncRoutes from './sync/routes';

const debugInit = debugServer('init');
const debugAuth = debugServer('authentication');

debugInit(`Initializing Sanremo ${process.env.npm_package_version} on ${process.env.NODE_ENV}`);

const app = express();
const server = http.createServer(app);
const io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(server);

if (process.env.NODE_ENV === 'production' && !process.env.SECRET) {
  console.error('Production deployment but no SECRET defined!');
  process.exit(-1);
}
if (!process.env.DATABASE_URL) {
  console.error('No DATABASE_URL provided!');
  process.exit(-1);
}
const SECRET = process.env.SECRET || 'devsecret';
const SECURE = process.env.NODE_ENV === 'production';

// We use two cookies for authentication:
// - a 'server' cookie that is httpOnly and is used by express-session
// - a 'client' cookie that is not httpOnly and thus can be accessed (to be wiped) by client-side javascript
// Both are required for a valid session. This allows an XSS-safe server cookie and an offline-logout-able client cookie.
// If we just had the server cookie you could not logoff offline
//
// NB: This feels VERY CLOSE TO ROLLING OUR OWN SECURITY. I do not like it.
//
// TODO: validate this approach with someone who knows more about security than you
// We have validated that using the sanremo-client cookie as the sanremo cookie does not work, but that's it
// session.clientCookie feels really fragile and the wrong approach
const SERVER_COOKIE = 'sanremo';
const CLIENT_COOKIE = `${SERVER_COOKIE}-client`;
const SESSION_AGE = 1000 * 60 * 60 * 24 * 14; // two weeks

const pgSession = pgConnect(session);
const sess: SessionOptions = {
  secret: SECRET,
  name: SERVER_COOKIE,
  saveUninitialized: false,
  resave: true, // TODO: work out what we want this to be
  rolling: true,
  store: new pgSession({ pool: db }),
  cookie: {
    maxAge: SESSION_AGE,
    secure: SECURE,
    sameSite: true,
  },
};
const sesh = session(sess);

// TODO: work out how to get socket.io to work with this as well without neding @ts-ignore
declare module 'express-session' {
  interface SessionData {
    user: User;
  }
}

// Heroku-specific SSL work, other hosts may need different logic
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      res.set('location', `https://${req.hostname}${req.url}`);
      res.status(301);
      res.send();
    } else {
      next();
    }
  });
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(compression()); // TODO: use static compression instead for assets (so it only happens once): https://parceljs.org/features/production/#compression
app.use(express.static('dist/frontend')); // i.e. these should be compressed on disk
app.use(sesh);
app.use(cookieParser(SECRET));

const clientSideCookie = (res: Response<unknown, Record<string, unknown>, number>, user: User) => {
  const cookie = Object.assign({}, sess.cookie) as CookieOptions;
  cookie.httpOnly = false;
  cookie.signed = true;

  res.cookie(CLIENT_COOKIE, user, cookie);
};

// @ts-ignore TODO: make sure this works and if it does fix this ignore
io.use((socket, next) => sesh(socket.request, {}, next)); // TODO: make sure this cares about double cookie middleware

app.post('/api/auth', async (req, res) => {
  const username = req.body?.username?.toLowerCase();
  const password = req.body?.password;

  if (!(username && password)) {
    res.status(400);
    return res.end();
  }

  debugAuth(`/api/auth request for ${username}`);
  const result = await db.query('SELECT id, password FROM users WHERE username = $1::text', [
    username,
  ]);

  if (result?.rows.length === 1) {
    const id = result.rows[0].id;
    const hash = result.rows[0].password;
    if (await bcrypt.compare(password, hash)) {
      debugAuth(`/api/auth request for ${username} successful`);
      req.session.user = { id: id, name: username };

      // write cookie that javascript can clear
      clientSideCookie(res, req.session.user);
      return res.json(req.session.user);
    }

    debugAuth(`/api/auth request for ${username} denied, incorrect password`);
  } else {
    debugAuth(`/api/auth request for ${username} denied, no user by that name`);
  }

  res.status(401);
  res.end();
});
app.put('/api/auth', async (req, res) => {
  const username = req.body?.username?.toLowerCase();
  const password = req.body?.password;

  if (!(username && password)) {
    res.status(400);
    return res.end();
  }

  debugAuth(`/api/auth create request for ${username}`);
  const result = await db.query('SELECT id FROM users WHERE username = $1::text', [username]);

  if (result?.rows.length === 1) {
    debugAuth(`user ${username} already exists`);
    res.status(403);
    res.end();
  } else {
    const hash = await bcrypt.hash(password, 10); // TODO: read up and check if 10 is still a fine default
    await db.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hash]);
    const result = await db.query('SELECT id FROM users WHERE username = $1', [username]);

    debugAuth(`/api/auth create request for ${username} successful`);
    req.session.user = { id: result.rows[0].id, name: username };

    // write cookie that javascript can clear
    clientSideCookie(res, req.session.user);
    return res.json(req.session.user);
  }
});

// Validate both cookies for api access
app.use('/api/*', (req, res, next) => {
  const serverUser: User | undefined = req.session.user;
  const clientUser: User | undefined = req.signedCookies[CLIENT_COOKIE];

  debugAuth(
    `${req.method}: ${req.originalUrl} with server: ${JSON.stringify(
      serverUser,
    )}, client:${JSON.stringify(clientUser)}`,
  );

  if (
    serverUser &&
    clientUser &&
    clientUser.id === serverUser.id &&
    clientUser.name === serverUser.name
  ) {
    // Session is valid
    // re-up client-side cookie (express-session will deal with server-side)
    clientSideCookie(res, clientUser);
    next();
  } else {
    res.status(401);
    return res.json({ error: 'invalid authentication' });
  }
});
io.use((socket, next) => {
  // @ts-ignore https://github.com/socketio/socket.io/issues/3890
  const user = socket.request?.session?.user;
  if (user) {
    // TODO: also care about the client-side cookie? Or is the server-side enough?
    debugAuth(`SOCKET: connection with ${JSON.stringify(user)}`);
    next();
  } else {
    debugAuth('SOCKET: unauthenticated connection attempt');
    next(new Error('no authentication provided'));
  }
});

app.get('/api/auth', (req, res) => res.json(req.session.user));

app.get('/api/deployment', async (req, res) => {
  const toReturn: Record<string, unknown> = {
    release_version: process.env.npm_package_version,
  };

  if (process.env.NODE_ENV === 'production') {
    toReturn.deploy_created_at = process.env.HEROKU_RELEASE_CREATED_AT;
    toReturn.deploy_version = process.env.HEROKU_RELEASE_VERSION;
    toReturn.deploy_commit = process.env.HEROKU_SLUG_COMMIT;
  } else {
    toReturn.deploy_created_at = '1970-01-01T12:12:12Z';
    toReturn.deploy_version = 'continuous';
    toReturn.deploy_commit = 'HEAD';
  }

  if (req.session.user?.id === 1) {
    const userSummaries = await db.query(`
      SELECT users.id, users.username, COUNT(*) AS count
      FROM users
      JOIN raw_client_documents
      ON users.id = raw_client_documents.user_id
      GROUP BY users.id
      ORDER BY users.id`);

    toReturn.users = userSummaries.rows;
  }

  return res.json(toReturn);
});

syncRoutes(app, io);

const port = process.env.PORT || 80;
server.listen(port);

debugInit(`Started server on port ${port}`);
