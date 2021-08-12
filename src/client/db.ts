import PouchDB from 'pouchdb-browser';
import pdbFind from 'pouchdb-find';
import { User } from '../shared/types';
import { markStale } from './state/syncSlice';
import store from './store';
PouchDB.plugin(pdbFind);

export default function db(loggedInUser: User) {
  const db = new PouchDB(`sanremo-${loggedInUser.name}`, {
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

  db.changes({ live: true, include_docs: true, since: 'now' }).on('change', (change) => {
    const doc = change.doc
      ? change.doc
      : { _id: change.id, _rev: change.changes[0].rev, _deleted: true };

    store.dispatch(markStale(doc));
  });

  // @ts-ignore
  window.db = db;
  // TODO: add index for finding via slug
  return db;
}
