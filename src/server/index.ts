import { readFileSync } from 'fs';

import debugModule from 'debug';

import express, { CookieOptions } from 'express';
import session from 'express-session';
import { SessionOptions } from 'express-session';
import cookieParser from 'cookie-parser';
import compression from 'compression';

import http from 'http';
import { Server as SocketServer } from 'socket.io';

import bcrypt from 'bcryptjs';
import pgConnect from 'connect-pg-simple';

import syncRoutes from './sync/routes';
import { db } from './db';
import { ClientToServerEvents, ServerToClientEvents, User } from '../shared/types';
import { Response } from 'express-serve-static-core';

const debugServer = debugModule('sanremo:server');
const debugAuth = debugModule('sanremo:server:authentication');

debugServer(`Initializing Sanremo server on ${process.env.NODE_ENV}`);

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
const SECRET = (process.env.NODE_ENV === 'production' ? process.env.SECRET : 'devsecret') as string;
const SECURE = process.env.NODE_ENV === 'production';

// We use two cookies for authentication:
// - a 'server' cookie that is httpOnly and is used by express-session
// - a 'client' cookie that is not httpOnly and can be wiped by client-side javascript
// Both are required for a valid session. This allows an XSS-safe server cookie and an offline-logout-able client cookie
//
// NB: This feels VERY CLOSE TO ROLLING OUR OWN SECURITY. I do not like it.
//
// TODO: validate this approach with someone who knows more about security than you
// we have validated that using the sanremo-client cookie as the sanremo cookie does not work, but that's it
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

  app.use(function (req, res, next) {
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
app.use(compression()); // TODO: use static compression instead for assets (so it only happens once)
app.use(express.static('build')); // i.e. these should be compressed on disk
app.use(sesh);
app.use(cookieParser(SECRET));

const clientSideCookie = (res: Response<any, Record<string, any>, number>, user: User) => {
  const cookie = Object.assign({}, sess.cookie) as CookieOptions;
  cookie.httpOnly = false;
  cookie.signed = true;

  res.cookie(CLIENT_COOKIE, user, cookie);
};

// @ts-ignore TODO: make sure this works and if it does fix this ignore
io.use((socket, next) => sesh(socket.request, {}, next)); // TODO: make sure this cares about double cookie middleware

app.post('/api/auth', async function (req, res) {
  const { username, password } = req.body;
  debugAuth(`/api/auth request for ${username}`);
  const result = await db.query('SELECT id, password FROM users WHERE username = $1::text', [
    username,
  ]);

  if (result?.rows.length === 1) {
    const id = result.rows[0].id;
    const hash = result.rows[0].password;
    if (bcrypt.compareSync(password, hash)) {
      debugAuth(`/api/auth request for ${username} successful`);
      req.session.user = { id: id, name: username };

      // write cookie that javascript can clear
      clientSideCookie(res, req.session.user);
      return res.json(req.session.user);
    } else {
      debugAuth(`/api/auth request for ${username} denied, incorrect password`);
    }
  } else {
    debugAuth(`/api/auth request for ${username} denied, no user by that name`);
  }

  res.status(401);
  res.end();
});

// Validate both cookies for api access
app.use('/api/*', (req, res, next) => {
  const serverUser: User | undefined = req.session.user;
  const clientUser: User | undefined = req.signedCookies[CLIENT_COOKIE];

  debugAuth(
    `${req.method}: ${req.originalUrl} with server: ${JSON.stringify(
      serverUser
    )}, client:${JSON.stringify(clientUser)}`
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
  debugAuth(`SOCKET: connection with ${JSON.stringify(user)}`);
  if (user) {
    // TODO: also care about the client-side cookie? Or is the server-side enough?
    next();
  } else {
    next(new Error('no authentication provided'));
  }
});

app.get('/api/auth', function (req, res) {
  return res.json(req.session.user);
});

app.get('/api/deployment', async function (req, res) {
  const releaseVersion = JSON.parse(
    readFileSync(new URL('../../../package.json', import.meta.url).pathname, 'utf-8')
  ).version;

  const toReturn: Record<string, any> = {
    release_version: releaseVersion,
  };

  if (process.env.NODE_ENV === 'production') {
    toReturn.deploy_created_at = process.env.HEROKU_RELEASE_CREATED_AT;
    toReturn.deploy_version = process.env.HEROKU_RELEASE_VERSION;
    toReturn.deploy_commit = process.env.HEROKU_SLUG_COMMIT;
  } else {
    toReturn.deploy_created_at = '1970-01-01T12:12:12Z';
    toReturn.deploy_version = 'continuous';
    toReturn.deploy_commit = 'local HEAD';
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

app.get('/*', function (req, res, next) {
  const index = new URL('../../../build/index.html', import.meta.url).pathname;
  res.sendFile(index);
});

const port = process.env.PORT || 80;
server.listen(port);

debugServer(`Started server on port ${port}`);
