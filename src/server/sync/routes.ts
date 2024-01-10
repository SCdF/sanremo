import { DatabaseError } from 'pg-protocol';

import { Router } from 'express';
import { Server as SocketServer } from 'socket.io';

import { debugServer } from '../globals';

import { ClientToServerEvents, Doc, ServerToClientEvents, User, UserId } from '../../shared/types';
import sync from './sync';

const debug = debugServer('socket');

const POSTGRES_UNIQUE_VIOLATION = '23505';
/**
 * Sync 0.0: The Worst Possible Implementation
 *
 * Minimal syncing support to avoid having to install CouchDB on a server.
 *
 * How it works:
 *  - The CLIENT calls /begin, passing a collection of stubs containing a
 * stub for every document the CLIENT has. If the SERVER needs to delete a document it will do so here
 *  - The SERVER returns two stub collections: documents that the CLIENT should
 * request from the SERVER, and documents the CLIENT should send to the SERVER
 *  - The CLIENT performs this (with batching) using /request to get documents
 * and /update to send documents
 *
 * Problems:
 *  - Very heavy. Is essentially a dumb "full sync" every time.
 *  - No intelligence in regard to conflicts. We are picking the biggest rev
 * as the winner, which can obviously be deeply wrong
 *  - Deletes just get deleted, rev and other data does not matter. DELETES ALWAYS WIN
 *  - Does not support attachments
 */
export default function routes(
  app: Router,
  io: SocketServer<ClientToServerEvents, ServerToClientEvents>,
) {
  app.post('/api/sync/begin', async (req, res) => {
    try {
      const stubs = req.body.docs || [];
      let results;
      try {
        results = await sync.begin(req.session.user as User, stubs);
      } catch (error) {
        if (error instanceof DatabaseError && error.code === POSTGRES_UNIQUE_VIOLATION) {
          console.warn('Failed to `/api/sync/begin` the first time, conflict, retrying');
          // duplicate key, implies two syncs from the same client, try again one more time
          // if we rerunit my last or rocky okay a a in1//
          // TODO: deal with this more robustly
          results = await sync.begin(req.session.user as User, stubs);
        } else {
          throw error;
        }
      }
      res.json(results);
    } catch (error) {
      console.warn('Unexpected error on /api/sync/begin', error);
      res.status(500);
      res.end();
    }
  });
  app.post('/api/sync/request', async (req, res) => {
    try {
      const stubs = req.body.docs || [];
      const results = await sync.request(req.session.user as User, stubs);
      res.json(results);
    } catch (error) {
      console.warn('Unexpected error on /api/sync/request', error);
      res.status(500);
      res.end();
    }
  });
  app.post('/api/sync/update', async (req, res) => {
    try {
      const docs = req.body.docs || [];
      // biome-ignore lint/style/noNonNullAssertion: TODO do this right
      const user = req.session.user!;

      await sync.update(user, docs);
      broadcastDocUpdate(user, docs);

      res.end();
    } catch (error) {
      console.warn('Unexpected error on /api/sync/update', error);
      res.status(500);
      res.end();
    }
  });

  // TODO: first off this obviously won't scale
  // but also surely there is a bit a way of doing this, ideally provided by socket.io
  type SocketIdMap = Map<UserId, Set<string>>;
  const socketIds: SocketIdMap = new Map();

  const broadcastDocUpdate = (user: User, docs: Doc[], currentSocketId?: string) => {
    const userSockets = Array.from(socketIds.get(user.id) || []);

    for (const socketId of userSockets) {
      if (currentSocketId !== socketId) {
        debug(`sending ${docs.length} to ${JSON.stringify(user)} as ${socketId}`);

        io.to(socketId).emit('docUpdate', docs);
      }
    }
  };

  io.on('connection', (socket) => {
    // @ts-ignore https://github.com/socketio/socket.io/issues/3890
    const user: User = socket.request.session.user;
    if (!socketIds.has(user.id)) {
      socketIds.set(user.id, new Set());
    }
    // biome-ignore lint/style/noNonNullAssertion: TODO do this right
    const socketSet = socketIds.get(user.id)!;
    const socketId = socket.id;

    socket.on('ready', () => {
      debug(`${JSON.stringify(user)} connected as ${socketId}`);
      socketSet.add(socketId);
    });

    socket.on('disconnect', () => {
      debug(`${JSON.stringify(user)} as ${socketId} disconnected`);
      socketSet.delete(socketId);
    });

    socket.on('docUpdate', async (docs) => {
      debug(`${JSON.stringify(user)} as ${socketId} sent us ${docs.length}`);

      await sync.update(user, docs);
      broadcastDocUpdate(user, docs, socketId);
    });
  });
}
