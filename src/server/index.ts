import http from 'node:http';
import compression from 'compression';
import pgConnect from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import express from 'express';
import session, { type SessionOptions } from 'express-session';
import { Server as SocketServer } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, User } from '../shared/types';
import { setupAuthRoutes } from './auth';
import { db } from './db';
import { debugServer } from './globals';
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

const pgSession = pgConnect(session);
const sess: SessionOptions = {
  secret: SECRET,
  name: 'sanremo',
  saveUninitialized: false,
  resave: true, // TODO: work out what we want this to be
  rolling: true,
  store: new pgSession({ pool: db }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 14, // two weeks
    secure: SECURE,
    sameSite: true,
  },
};
const sesh = session(sess);

// TODO: work out how to get socket.io to work with this as well without neding @ts-expect-error
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
      res.redirect(301, `https://${req.hostname}${req.url}`);
    } else {
      next();
    }
  });
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// @ts-expect-error - compression types not fully compatible with Express 5 RequestHandler
app.use(compression()); // TODO: use static compression instead for assets (so it only happens once): https://parceljs.org/features/production/#compression
app.use(express.static('dist/client')); // i.e. these should be compressed on disk
// @ts-expect-error - express-session types not fully compatible with Express 5 RequestHandler
app.use(sesh);
app.use(cookieParser(SECRET));

// Setup authentication routes
setupAuthRoutes(app, sess);

// @ts-expect-error TODO: make sure this works and if it does fix this ignore
io.use((socket, next) => sesh(socket.request, {}, next)); // TODO: make sure this cares about double cookie middleware

io.use((socket, next) => {
  // @ts-expect-error https://github.com/socketio/socket.io/issues/3890
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

app.get('/api/deployment', async (req, res) => {
  const toReturn: Record<string, unknown> = {
    release_version: process.env.npm_package_version,
  };

  if (process.env.NODE_ENV === 'production') {
    toReturn.deploy_version =
      process.env.RAILWAY_DEPLOYMENT_ID || process.env.HEROKU_RELEASE_VERSION;
    toReturn.deploy_commit = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.HEROKU_SLUG_COMMIT;
  } else {
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
