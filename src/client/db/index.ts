import IdbAdapter from 'pouchdb-adapter-idb';
import PouchDB from 'pouchdb-core';
import Find from 'pouchdb-find';

import { Doc, User } from '../../shared/types';
import mirrored from '../db-mirror';
import { markStale } from '../features/Sync/syncSlice';
import { Guest, GuestUser } from '../features/User/userSlice';
import store from '../store';
import setup from './setup';

PouchDB.plugin(IdbAdapter);
PouchDB.plugin(Find);

export interface Database extends PouchDB.Database {
  // FIXME: we should be using redux for this. ie listen for redux changes and write to pouch in one place
  userPut(doc: Doc): Promise<Doc>;
}

// TODO: we don't need to append the database name with the username
// We delete the database when they user logs out, so there shouldn't be a conflict
// NB: when logging in versus creating an account we would have to consider taking guest data
function handle(loggedInUser: User | Guest): Database {
  let db = new PouchDB(`sanremo-${loggedInUser.name}`, {
    adapter: 'idb',
    auto_compaction: true,
  }) as Database;

  if (loggedInUser.id === 1) {
    db = mirrored(db, loggedInUser);
  }

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
  const local = handle(user);
  const guest = handle(GuestUser);
  await guest.replicate.to(local);
  await guest.destroy();
}
