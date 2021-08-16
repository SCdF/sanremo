import PouchDB from 'pouchdb-browser';
import pdbFind from 'pouchdb-find';
import { Doc, User } from '../shared/types';
import { markStale } from './state/syncSlice';
import store from './store';
PouchDB.plugin(pdbFind);

export interface Database extends PouchDB.Database {
  userPut(doc: Doc): Promise<Doc>;
}

export default function db(loggedInUser: User): Database {
  // @ts-ignore
  const db: Database = new PouchDB(`sanremo-${loggedInUser.name}`, {
    auto_compaction: true,
  });

  // FIXME: move this somewhere less stupid (this will be stupid once we're syncing with a remote server probably)
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

  // TODO: don't do this
  // this is a sign that we need to rework our use of redux, such that it does this for us
  db.userPut = async (doc: Doc): Promise<Doc> => {
    const { rev } = await db.put(doc);
    doc._rev = rev;

    store.dispatch(markStale(doc));

    return doc;
  };

  // @ts-ignore
  window.db = db;
  // TODO: add index for finding via slug
  return db;
}
