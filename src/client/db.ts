// This complexity exists entirely to allow for:
// - userPut, which we should do in a more redux'y way and should not exist
// - having two dbs and comparing for PouchDB testing.
// Otherwise this would be basically three lines
// TODO: once we're decided on indexeddb or no, drop this complexity!

import PouchDB from 'pouchdb-core';
import IdbAdapter from 'pouchdb-adapter-idb';
import Find from 'pouchdb-find';

import DeepDiff from 'deep-diff';

import { Doc, User } from '../shared/types';
import { markStale } from './features/Sync/syncSlice';
import store from './store';
import { Debugger } from 'debug';
import { debugClient } from './globals';
import { Guest, GuestUser } from './features/User/userSlice';
import migrate from './migrations/0.0.4';

PouchDB.plugin(IdbAdapter);
PouchDB.plugin(Find);

const debugs = {} as Record<string, Debugger>;
const debug = (name: string) => {
  if (!debugs[name]) {
    debugs[name] = debugClient('database', name);
  }
  return debugs[name];
};

export interface Database {
  userPut(doc: Doc): Promise<Doc>;
  changes<Model>(options?: PouchDB.Core.ChangesOptions): PouchDB.Core.Changes<Model>;
  allDocs<Model>(
    options?:
      | PouchDB.Core.AllDocsWithKeyOptions
      | PouchDB.Core.AllDocsWithKeysOptions
      | PouchDB.Core.AllDocsWithinRangeOptions
      | PouchDB.Core.AllDocsOptions
  ): Promise<PouchDB.Core.AllDocsResponse<Model>>;
  bulkDocs<Model>(
    docs: Array<PouchDB.Core.PutDocument<Model>>,
    options?: PouchDB.Core.BulkDocsOptions
  ): Promise<Array<PouchDB.Core.Response | PouchDB.Core.Error>>;
  get<Model>(
    docId: PouchDB.Core.DocumentId,
    options?: PouchDB.Core.GetOptions
  ): Promise<PouchDB.Core.Document<Model> & PouchDB.Core.GetMeta>;
  find(request?: PouchDB.Find.FindRequest<{}>): Promise<PouchDB.Find.FindResponse<{}>>;
  destroy(): Promise<void>;
}

// don't subject others to this testing
const trialingBoth = (user: User) => user.id === 1;

// TODO: we don't need to append the database name with the username
// We delete the database when they user logs out, so there shouldn't be a conflict
// NB: when logging in versus creating an account we would have to consider taking guest data
function handle(loggedInUser: User | Guest): { db: Database; _db: PouchDB.Database } {
  const idb = new PouchDB(`sanremo-${loggedInUser.name}`, {
    adapter: 'idb',
    auto_compaction: true,
  });
  let indexeddb: PouchDB.Database;
  let trial: Promise<any>;
  if (trialingBoth(loggedInUser)) {
    trial = import('pouchdb-adapter-indexeddb').then(({ default: indexeddbAdapter }) => {
      PouchDB.plugin(indexeddbAdapter);
      indexeddb = new PouchDB(`sanremo-${loggedInUser.name}-indexeddb`, {
        auto_compaction: true,
        adapter: 'indexeddb',
      });
    });
  }

  const every = async function (
    name: string,
    fn: (db: PouchDB.Database) => Promise<any> | void,
    detail?: any
  ) {
    let idbTime = performance.now();
    const idbResult = await fn(idb);
    idbTime = performance.now() - idbTime;

    if (!trialingBoth(loggedInUser)) {
      return idbResult;
    }

    await trial;

    let indexeddbTime = performance.now();
    const indexeddbResult = await fn(indexeddb);
    indexeddbTime = performance.now() - indexeddbTime;

    const timeDiff = idbTime - indexeddbTime;
    debug(name)(
      `indexeddb ${timeDiff >= 0 ? '<' : '> (!!!)'} idb (~${Math.round(
        Math.abs(timeDiff) * 1000
      )}μs)`,
      timeDiff,
      detail
    );

    const diff = DeepDiff.diff(idbResult, indexeddbResult);
    if (diff && diff.length) {
      debug(name)(`returned different results`, idbResult, indexeddbResult, diff);
      console.warn(`${name} returned different results`, {
        idbResult,
        indexeddbResult,
        diff,
      });
      alert('different results returned, check the logs');
    }
    return idbResult;
  };

  every('db setup', async (db) => {
    db.createIndex({
      index: {
        fields: ['updated'],
      },
    });
    db.createIndex({
      index: {
        fields: ['completed'],
      },
    });
    db.createIndex({
      index: {
        fields: ['template'],
      },
    });
    // TODO: add index for finding via slug

    migrate(db);

    db.changes({ live: true, conflicts: true, include_docs: true }).on('change', (change) => {
      if (change.doc?._conflicts?.length) {
        console.error(`Conflict detected in write to ${db.name}`, change);
      }
    });
  });

  return {
    db: {
      // TODO: don't do this
      // this is a sign that we need to rework our use of redux, such that it does this for us
      userPut: async (doc: Doc): Promise<Doc> => {
        const { rev } = await every('userPut', (db) => db.put(doc), doc);
        doc._rev = rev;

        store.dispatch(markStale(doc));

        return doc;
      },
      changes: <Model>(options?: PouchDB.Core.ChangesOptions): PouchDB.Core.Changes<Model> => {
        return every(
          'changes',
          (db) => db.changes(options),
          options
        ) as PouchDB.Core.Changes<Model>;
      },
      allDocs: <Model>(
        options?:
          | PouchDB.Core.AllDocsWithKeyOptions
          | PouchDB.Core.AllDocsWithKeysOptions
          | PouchDB.Core.AllDocsWithinRangeOptions
          | PouchDB.Core.AllDocsOptions
      ): Promise<PouchDB.Core.AllDocsResponse<Model>> => {
        return every('allDocs', (db) => db.allDocs(options), options);
      },
      bulkDocs: <Model>(
        docs: Array<PouchDB.Core.PutDocument<Model>>,
        options?: PouchDB.Core.BulkDocsOptions
      ): Promise<Array<PouchDB.Core.Response | PouchDB.Core.Error>> => {
        return every('bulkDocs', (db) => db.bulkDocs(docs, options), [docs, options]);
      },
      get: <Model>(
        docId: PouchDB.Core.DocumentId,
        options?: PouchDB.Core.GetOptions
      ): Promise<PouchDB.Core.Document<Model> & PouchDB.Core.GetMeta> => {
        return every(`get`, (db) => db.get(docId, options || {}), options);
      },
      find: (request?: PouchDB.Find.FindRequest<{}>): Promise<PouchDB.Find.FindResponse<{}>> => {
        return every('find', (db) => db.find(request), request);
      },
      destroy: () => {
        return every('destroy', (db) => db.destroy());
      },
    },
    _db: idb,
  };
}

// we store it here because redux doesn't like non-serializable state, and Context is more trouble than it's worth
// this way we just keep the user in the store and get the DB from here each time
//
// nb: the only time you'll have more than one of these is if you start as a guest and change to a logged in user,
// switch users without reloading etc.
let handleCache = {} as Record<number, { db: Database; _db: PouchDB.Database }>;

export default function db(loggedInUser: User | Guest): Database {
  if (!handleCache[loggedInUser.id]) {
    handleCache[loggedInUser.id] = handle(loggedInUser);
  }

  const db = handleCache[loggedInUser.id].db;
  // @ts-ignore
  window.IDB = handleCache[loggedInUser.id]._db;
  return db;
}

export async function migrateFromGuest(user: User) {
  const local = handle(user)._db;
  const guest = handle(GuestUser)._db;
  await guest.replicate.to(local);
  await guest.destroy();
}
