import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { Mock, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './db';

// Mock dependencies
vi.mock('./db');
vi.mock('bcryptjs');

// Import after mocks are set up
import { debugServer } from './globals';

describe('Authentication Endpoints', () => {
  let app: express.Express;
  const SECRET = 'test-secret';
  const SERVER_COOKIE = 'sanremo';
  const CLIENT_COOKIE = `${SERVER_COOKIE}-client`;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Create Express app with same middleware as server
    app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(
      session({
        secret: SECRET,
        name: SERVER_COOKIE,
        saveUninitialized: false,
        resave: true,
        rolling: true,
        cookie: {
          maxAge: 1000 * 60 * 60 * 24 * 14,
          secure: false,
          sameSite: true,
        },
      }),
    );
    app.use(cookieParser(SECRET));

    // Helper function for client-side cookie
    const clientSideCookie = (res: express.Response, user: { id: number; name: string }) => {
      const cookie: express.CookieOptions = {
        maxAge: 1000 * 60 * 60 * 24 * 14,
        secure: false,
        sameSite: true,
        httpOnly: false,
        signed: true,
      };
      res.cookie(CLIENT_COOKIE, user, cookie);
    };

    // POST /api/auth - Login
    app.post('/api/auth', async (req, res) => {
      const username = req.body?.username?.toLowerCase();
      const password = req.body?.password;

      if (!(username && password)) {
        res.status(400);
        return res.end();
      }

      const result = await db.query('SELECT id, password FROM users WHERE username = $1::text', [
        username,
      ]);

      if (result?.rows.length === 1) {
        const id = result.rows[0].id;
        const hash = result.rows[0].password;
        if (await bcrypt.compare(password, hash)) {
          req.session.user = { id: id, name: username };
          clientSideCookie(res, req.session.user);
          return res.json(req.session.user);
        }
      }

      res.status(401);
      res.end();
    });

    // PUT /api/auth - Register
    app.put('/api/auth', async (req, res) => {
      const username = req.body?.username?.toLowerCase();
      const password = req.body?.password;

      if (!(username && password)) {
        res.status(400);
        return res.end();
      }

      const checkResult = await db.query('SELECT id FROM users WHERE username = $1::text', [
        username,
      ]);

      if (checkResult?.rows.length === 1) {
        res.status(403);
        res.end();
      } else {
        const hash = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hash]);
        const result = await db.query('SELECT id FROM users WHERE username = $1', [username]);

        req.session.user = { id: result.rows[0].id, name: username };
        clientSideCookie(res, req.session.user);
        return res.json(req.session.user);
      }
    });

    // Middleware to validate both cookies
    app.use('/api/*', (req, res, next) => {
      const serverUser = req.session.user;
      const clientUser = req.signedCookies[CLIENT_COOKIE];

      if (
        serverUser &&
        clientUser &&
        clientUser.id === serverUser.id &&
        clientUser.name === serverUser.name
      ) {
        clientSideCookie(res, clientUser);
        next();
      } else {
        res.status(401);
        return res.json({ error: 'invalid authentication' });
      }
    });

    // GET /api/auth - Get current user
    app.get('/api/auth', (req, res) => res.json(req.session.user));
  });

  describe('POST /api/auth (Login)', () => {
    it('should login with valid credentials', async () => {
      const mockUser = { id: 1, password: 'hashed-password' };
      (db.query as Mock).mockResolvedValue({ rows: [mockUser] });
      (bcrypt.compare as Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth')
        .send({ username: 'testuser', password: 'password123' })
        .expect(200);

      expect(response.body).toEqual({ id: 1, name: 'testuser' });
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, password FROM users WHERE username = $1::text',
        ['testuser'],
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');

      // Check cookies are set
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.startsWith('sanremo='))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith('sanremo-client='))).toBe(true);
    });

    it('should convert username to lowercase', async () => {
      const mockUser = { id: 1, password: 'hashed-password' };
      (db.query as Mock).mockResolvedValue({ rows: [mockUser] });
      (bcrypt.compare as Mock).mockResolvedValue(true);

      await request(app)
        .post('/api/auth')
        .send({ username: 'TestUser', password: 'password123' })
        .expect(200);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, password FROM users WHERE username = $1::text',
        ['testuser'],
      );
    });

    it('should return 401 for incorrect password', async () => {
      const mockUser = { id: 1, password: 'hashed-password' };
      (db.query as Mock).mockResolvedValue({ rows: [mockUser] });
      (bcrypt.compare as Mock).mockResolvedValue(false);

      await request(app)
        .post('/api/auth')
        .send({ username: 'testuser', password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 401 for non-existent user', async () => {
      (db.query as Mock).mockResolvedValue({ rows: [] });

      await request(app)
        .post('/api/auth')
        .send({ username: 'nonexistent', password: 'password123' })
        .expect(401);

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return 400 for missing username', async () => {
      await request(app).post('/api/auth').send({ password: 'password123' }).expect(400);

      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return 400 for missing password', async () => {
      await request(app).post('/api/auth').send({ username: 'testuser' }).expect(400);

      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return 400 for empty credentials', async () => {
      await request(app).post('/api/auth').send({}).expect(400);

      expect(db.query).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/auth (Register)', () => {
    it('should register a new user', async () => {
      // First query checks if user exists (returns empty)
      // Second query gets the newly created user's ID
      (db.query as Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce(undefined) // INSERT doesn't return rows
        .mockResolvedValueOnce({ rows: [{ id: 42 }] });

      (bcrypt.hash as Mock).mockResolvedValue('hashed-password');

      const response = await request(app)
        .put('/api/auth')
        .send({ username: 'newuser', password: 'password123' })
        .expect(200);

      expect(response.body).toEqual({ id: 42, name: 'newuser' });
      expect(db.query).toHaveBeenCalledWith('SELECT id FROM users WHERE username = $1::text', [
        'newuser',
      ]);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO users (username, password) VALUES ($1, $2)',
        ['newuser', 'hashed-password'],
      );

      // Check cookies are set
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.startsWith('sanremo='))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith('sanremo-client='))).toBe(true);
    });

    it('should convert username to lowercase', async () => {
      (db.query as Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ id: 42 }] });
      (bcrypt.hash as Mock).mockResolvedValue('hashed-password');

      await request(app)
        .put('/api/auth')
        .send({ username: 'NewUser', password: 'password123' })
        .expect(200);

      expect(db.query).toHaveBeenCalledWith('SELECT id FROM users WHERE username = $1::text', [
        'newuser',
      ]);
    });

    it('should return 403 if username already exists', async () => {
      (db.query as Mock).mockResolvedValue({ rows: [{ id: 1 }] });

      await request(app)
        .put('/api/auth')
        .send({ username: 'existinguser', password: 'password123' })
        .expect(403);

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should return 400 for missing username', async () => {
      await request(app).put('/api/auth').send({ password: 'password123' }).expect(400);

      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return 400 for missing password', async () => {
      await request(app).put('/api/auth').send({ username: 'testuser' }).expect(400);

      expect(db.query).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/auth (Get Current User)', () => {
    it('should return current user when authenticated', async () => {
      // First, login to establish session
      const mockUser = { id: 1, password: 'hashed-password' };
      (db.query as Mock).mockResolvedValue({ rows: [mockUser] });
      (bcrypt.compare as Mock).mockResolvedValue(true);

      const loginResponse = await request(app)
        .post('/api/auth')
        .send({ username: 'testuser', password: 'password123' });

      const cookies = loginResponse.headers['set-cookie'];

      // Now get current user
      const response = await request(app).get('/api/auth').set('Cookie', cookies).expect(200);

      expect(response.body).toEqual({ id: 1, name: 'testuser' });
    });

    it('should return 401 without valid session', async () => {
      await request(app).get('/api/auth').expect(401);
    });

    it('should return 401 with only server cookie', async () => {
      // Create a session but don't set client cookie
      const mockUser = { id: 1, password: 'hashed-password' };
      (db.query as Mock).mockResolvedValue({ rows: [mockUser] });
      (bcrypt.compare as Mock).mockResolvedValue(true);

      const loginResponse = await request(app)
        .post('/api/auth')
        .send({ username: 'testuser', password: 'password123' });

      const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
      const serverCookie = cookies.find((c: string) => c.startsWith('sanremo=')) as string;

      await request(app).get('/api/auth').set('Cookie', serverCookie).expect(401);
    });
  });
});
