import { Router } from 'express';
import { User } from '../types';
import sync from './sync';

/**
 * Sync 0.0: The Worst Possible Implementation
 *
 * Minimal syncing support to avoid having to install CouchDB on a server.
 *
 * How it works:
 *  - The CLIENT calls /declare, passing a collection of stubs containing a
 * stub for every document the CLIENT has.
 *  - The SERVER returns two stub collections: documents that the CLIENT should
 * request from the SERVER, and documents the CLIENT should send to the SERVER
 *  - The CLIENT performs this (with batching) using /request to get documents
 * and /update to send documents
 *
 * Problems:
 *  - Very heavy. Is essentially a dumb "full sync" every time.
 *  - No intelligence in regard to conflicts. We are picking the biggest rev
 * as the winner, which can obviously be deeply wrong
 *  - We are potentially non optimal around deletes, as we just store them like
 * normal
 *  - Does not support attachments
 */
export default function routes(app: Router) {
  app.post('/api/sync/declare', async function (req, res) {
    try {
      const stubs = req.body.docs || [];
      const results = await sync.declare(req.session.user as User, stubs);
      res.json(results);
    } catch (error) {
      console.log('Unexpected error on /api/sync/declare', error);
      res.status(500);
      res.end();
    }
  });
  app.post('/api/sync/request', async function (req, res) {
    try {
      const stubs = req.body.docs || [];
      const results = await sync.request(req.session.user as User, stubs);
      res.json(results);
    } catch (error) {
      console.log('Unexpected error on /api/sync/request', error);
      res.status(500);
      res.end();
    }
  });
  app.post('/api/sync/update', async function (req, res) {
    try {
      const docs = req.body.docs || [];
      await sync.update(req.session.user as User, docs);
      res.end();
    } catch (error) {
      console.log('Unexpected error on /api/sync/update', error);
      res.status(500);
      res.end();
    }
  });
}
