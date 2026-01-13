import IndexeddbAdapter from 'pouchdb-adapter-indexeddb';
import PouchDB from 'pouchdb-core';
import Find from 'pouchdb-find';

import type { Doc, User } from '../../shared/types';
import { markStale } from '../features/Sync/syncSlice';
import { type Guest, GuestUser } from '../features/User/userSlice';
import store from '../store';
import setup from './setup';

PouchDB.plugin(IndexeddbAdapter);
PouchDB.plugin(Find);

/**
 * Cleanup function to delete old IndexedDB databases from before the 2.0 migration.
 * Old databases were named `sanremo-${username}` (with PouchDB prefix `_pouch_`).
 * New databases are named `sanremo-2.0-${username}`.
 */
async function cleanupOldDatabases(): Promise<void> {
  // indexedDB.databases() is not available in all browsers, but is in modern ones
  if (!indexedDB.databases) {
    return;
  }

  try {
    const databases = await indexedDB.databases();

    const oldDatabases = databases.filter(
      (db) => db.name?.startsWith('_pouch_sanremo-') && !db.name?.startsWith('_pouch_sanremo-2.0-'),
    );

    for (const db of oldDatabases) {
      if (db.name) {
        console.log(`[db] Deleting old database: ${db.name}`);
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(db.name as string);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          request.onblocked = () => {
            console.warn(`[db] Database deletion blocked: ${db.name}`);
            resolve();
          };
        });
      }
    }

    if (oldDatabases.length > 0) {
      console.log(`[db] Cleaned up ${oldDatabases.length} old database(s)`);
    }
  } catch (error) {
    // Non-critical cleanup, log but don't throw
    console.warn('[db] Failed to cleanup old databases:', error);
  }
}

export interface Database extends PouchDB.Database {
  // FIXME: we should be using redux for this. ie listen for redux changes and write to pouch in one place
  userPut(doc: Doc): Promise<Doc>;
}

// TODO: we don't need to append the database name with the username
// We delete the database when they user logs out, so there shouldn't be a conflict
// NB: when logging in versus creating an account we would have to consider taking guest data
function handle(loggedInUser: User | Guest): Database {
  const db = new PouchDB(`sanremo-2.0-${loggedInUser.name}`, {
    adapter: 'indexeddb',
    auto_compaction: true,
  }) as Database;

  // Cleanup old databases in the background (fire and forget)
  cleanupOldDatabases();

  db.userPut = async (doc: Doc): Promise<Doc> => {
    const { rev } = await db.put(doc);
    doc._rev = rev;

    store.dispatch(markStale(doc));

    return doc;
  };

  return db;
}

// we store the handle here because redux doesn't like non-serializable state, and Context is more trouble than it's worth
// this way we just keep the user in the store and get the DB from here each time
//
// nb: the only time you'll have more than one of these is if you start as a guest and change to a logged in user,
// switch users without reloading etc.
let lastUserId: number;
let lastHandle: Database;

export default function db(user: User | Guest): Database {
  if (lastUserId !== user.id) {
    lastUserId = user.id;
    lastHandle = handle(user);
    setup(lastHandle);
  }

  return lastHandle;
}

export async function migrateFromGuest(user: User) {
  // Dynamically load replication plugin only when needed
  const Replication = (await import('pouchdb-replication')).default;
  PouchDB.plugin(Replication);

  const userDb = handle(user);
  const guestDb = handle(GuestUser);
  await guestDb.replicate.to(userDb);
  await guestDb.destroy();
}
