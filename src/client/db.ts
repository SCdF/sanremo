import PouchDB from 'pouchdb-browser';
import pdbFind from 'pouchdb-find';
import { User } from '../server/types';
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
  // @ts-ignore
  window.db = db;
  // TODO: add index for finding via slug
  return db;
}
