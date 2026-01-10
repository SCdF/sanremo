import http from 'http';
import express from 'express';
import session from 'express-session';
import { DatabaseError } from 'pg-protocol';
import { Server as SocketServer } from 'socket.io';
import { io as SocketClient } from 'socket.io-client';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { when } from 'vitest-when';
import { User } from '../../shared/types';
import syncRoutes from './routes';
import sync from './sync';

vi.mock('./sync');

describe('Sync Routes', () => {
  let app: express.Express;
  let server: http.Server;
  let io: SocketServer;
  let baseURL: string;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  const testUser: User = { id: 1, name: 'testuser' };

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Suppress console.warn for intentional error tests
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Create Express app with session middleware
    app = express();
    app.use(express.json());
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false },
      }),
    );

    // Add test middleware to inject user into session
    app.use((req, res, next) => {
      req.session.user = testUser;
      next();
    });

    // Create HTTP server and Socket.IO
    server = http.createServer(app);
    io = new SocketServer(server);

    // Apply sync routes
    syncRoutes(app, io);

    // Start server on random port
    const port = Math.floor(Math.random() * 10000) + 30000;
    server.listen(port);
    baseURL = `http://localhost:${port}`;
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    return new Promise<void>((resolve) => {
      io.close(() => {
        server.close(() => {
          resolve();
        });
      });
    });
  });

  describe('POST /api/sync/begin', () => {
    it('should handle sync begin request', async () => {
      const mockStubs = [
        { _id: 'doc1', _rev: '1-abc' },
        { _id: 'doc2', _rev: '1-def' },
      ];
      const mockResponse = {
        server: [{ _id: 'doc3', _rev: '1-ghi' }],
        client: [{ _id: 'doc4', _rev: '1-jkl' }],
      };

      when(vi.mocked(sync.begin)).calledWith(testUser, mockStubs).thenResolve(mockResponse);

      const response = await request(app)
        .post('/api/sync/begin')
        .send({ docs: mockStubs })
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(sync.begin).toHaveBeenCalledWith(testUser, mockStubs);
    });

    it('should handle empty docs array', async () => {
      const mockResponse = { server: [], client: [] };
      when(vi.mocked(sync.begin)).calledWith(testUser, []).thenResolve(mockResponse);

      const response = await request(app).post('/api/sync/begin').send({}).expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(sync.begin).toHaveBeenCalledWith(testUser, []);
    });

    it('should retry on duplicate key error', async () => {
      const mockStubs = [{ _id: 'doc1', _rev: '1-abc' }];
      const mockResponse = { server: [], client: [] };

      // First call fails with duplicate key error, second succeeds
      const duplicateError = new DatabaseError('duplicate key', 100, 'error');
      // @ts-ignore - setting readonly property for test
      duplicateError.code = '23505';

      vi.mocked(sync.begin)
        .mockRejectedValueOnce(duplicateError)
        .mockResolvedValueOnce(mockResponse);

      const response = await request(app)
        .post('/api/sync/begin')
        .send({ docs: mockStubs })
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(sync.begin).toHaveBeenCalledTimes(2);
    });

    it('should return 500 on unexpected error', async () => {
      when(vi.mocked(sync.begin))
        .calledWith(testUser, [])
        .thenReject(new Error('Database connection failed'));

      await request(app).post('/api/sync/begin').send({ docs: [] }).expect(500);
    });
  });

  describe('POST /api/sync/request', () => {
    it('should handle sync request', async () => {
      const mockStubs = [
        { _id: 'doc1', _rev: '1-abc' },
        { _id: 'doc2', _rev: '1-def' },
      ];
      const mockDocs = [
        { _id: 'doc1', _rev: '1-abc', content: 'data1' },
        { _id: 'doc2', _rev: '1-def', content: 'data2' },
      ];

      when(vi.mocked(sync.request)).calledWith(testUser, mockStubs).thenResolve(mockDocs);

      const response = await request(app)
        .post('/api/sync/request')
        .send({ docs: mockStubs })
        .expect(200);

      expect(response.body).toEqual(mockDocs);
      expect(sync.request).toHaveBeenCalledWith(testUser, mockStubs);
    });

    it('should handle empty request', async () => {
      when(vi.mocked(sync.request)).calledWith(testUser, []).thenResolve([]);

      const response = await request(app).post('/api/sync/request').send({}).expect(200);

      expect(response.body).toEqual([]);
      expect(sync.request).toHaveBeenCalledWith(testUser, []);
    });

    it('should return 500 on error', async () => {
      when(vi.mocked(sync.request))
        .calledWith(testUser, [])
        .thenReject(new Error('Request failed'));

      await request(app).post('/api/sync/request').send({ docs: [] }).expect(500);
    });
  });

  describe('POST /api/sync/update', () => {
    it('should handle sync update', async () => {
      const mockDocs = [
        { _id: 'doc1', _rev: '2-abc', content: 'updated1' },
        { _id: 'doc2', _rev: '2-def', content: 'updated2' },
      ];

      when(vi.mocked(sync.update)).calledWith(testUser, mockDocs).thenResolve(undefined);

      await request(app).post('/api/sync/update').send({ docs: mockDocs }).expect(200);

      expect(sync.update).toHaveBeenCalledWith(testUser, mockDocs);
    });

    it('should handle empty update', async () => {
      when(vi.mocked(sync.update)).calledWith(testUser, []).thenResolve(undefined);

      await request(app).post('/api/sync/update').send({}).expect(200);

      expect(sync.update).toHaveBeenCalledWith(testUser, []);
    });

    it('should return 500 on error', async () => {
      when(vi.mocked(sync.update))
        .calledWith(testUser, [])
        .thenReject(new Error('Update failed'));

      await request(app).post('/api/sync/update').send({ docs: [] }).expect(500);
    });
  });
});
