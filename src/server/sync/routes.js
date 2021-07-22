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
 */
export default function routes(app, db) {
  app.post('/api/sync/declare', async function (req, res) {
    const docs = req.body.docs;
    const results = await sync.declare(db, req.session.user, docs);
    res.json(results);
  });
  app.post('/api/sync/request', async function (req, res) {});
  app.post('/api/sync/update', async function (res, req) {});
}
