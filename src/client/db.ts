import PouchDB from 'pouchdb-browser';
import Find from 'pouchdb-find';
import indexedDb from 'pouchdb-adapter-indexeddb';

import DeepDiff from 'deep-diff';

import { Doc, User } from '../shared/types';
import { markStale } from './state/syncSlice';
import store from './store';
import debugModule, { Debugger } from 'debug';

PouchDB.plugin(Find);
PouchDB.plugin(indexedDb);

const debugs = {} as Record<string, Debugger>;
const debug = (name: string) => {
  if (!debugs[name]) {
    debugs[name] = debugModule(`sanremo:client:database:${name}`) as Debugger;
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

export default function db(loggedInUser: User): Database {
  const idb = new PouchDB(`sanremo-${loggedInUser.name}`, {
    auto_compaction: true,
  });
  const indexeddb = new PouchDB(`sanremo-${loggedInUser.name}-indexeddb`, {
    auto_compaction: true,
    adapter: 'indexeddb',
  });
  // @ts-ignore
  window.IDB = idb;
  // @ts-ignore
  window.INDEXEDDB = indexeddb;

  const every = async function (
    name: string,
    fn: (db: PouchDB.Database) => Promise<any> | void,
    detail?: any
  ) {
    let idbTime = performance.now();
    const idbResult = await fn(idb);
    idbTime = performance.now() - idbTime;

    if (loggedInUser.id !== 1) {
      // don't subject others to this testing
      return idbResult;
    }

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
      console.warn(`sanremo:client:databasec:${name} returned different results`, {
        idbResult,
        indexeddbResult,
        diff,
      });
      alert('different results returned, check the logs');
    }
    return idbResult;
  };

  every('index setup', (db) => {
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
  });

  every('conflict check', (db) => {
    db.changes({ live: true, conflicts: true, include_docs: true }).on('change', (change) => {
      if (change.doc?._conflicts?.length) {
        console.error(`Conflict detected in write to ${db.name}`, change);
      }
    });
  });

  return {
    // TODO: don't do this
    // this is a sign that we need to rework our use of redux, such that it does this for us
    userPut: async (doc: Doc): Promise<Doc> => {
      const { rev } = await every('userPut', (db) => db.put(doc), doc);
      doc._rev = rev;

      store.dispatch(markStale(doc));

      return doc;
    },
    changes: <Model>(options?: PouchDB.Core.ChangesOptions): PouchDB.Core.Changes<Model> => {
      return every('changes', (db) => db.changes(options), options) as PouchDB.Core.Changes<Model>;
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
  };
}
