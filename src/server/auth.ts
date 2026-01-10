import bcrypt from 'bcryptjs';
import { CookieOptions, Express, Response } from 'express';
import { SessionOptions } from 'express-session';
import { User } from '../shared/types';
import { db } from './db';
import { debugServer } from './globals';

const debugAuth = debugServer('authentication');

const SERVER_COOKIE = 'sanremo';
const CLIENT_COOKIE = `${SERVER_COOKIE}-client`;

const clientSideCookie = (
  res: Response<unknown, Record<string, unknown>>,
  user: User,
  sessionCookie: CookieOptions,
) => {
  const cookie = Object.assign({}, sessionCookie) as CookieOptions;
  cookie.httpOnly = false;
  cookie.signed = true;

  res.cookie(CLIENT_COOKIE, user, cookie);
};

export function setupAuthRoutes(app: Express, sessionOptions: SessionOptions) {
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
        clientSideCookie(res, req.session.user, sessionOptions.cookie as CookieOptions);
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
      clientSideCookie(res, req.session.user, sessionOptions.cookie as CookieOptions);
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
      clientSideCookie(res, clientUser, sessionOptions.cookie as CookieOptions);
      next();
    } else {
      res.status(401);
      return res.json({ error: 'invalid authentication' });
    }
  });

  app.get('/api/auth', (req, res) => res.json(req.session.user));
}
