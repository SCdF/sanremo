import PouchDB from "pouchdb-browser";
import pdbFind from "pouchdb-find";
PouchDB.plugin(pdbFind);

const db = new PouchDB('sanremo-v2', {
  auto_compaction: true
});

// TODO: probably drop this, or work out a more react way of accessing it from the console
// NB: we at least need this for E2E tests right now
window.DB = db;

// FIXME: move this somewhere less stupid (this will be stupid once we're syncing with a remote server probably)
db.createIndex({
  index: {
    fields: ['updated']
  }
});
db.createIndex({
  index: {
    fields: ['completed']
  }
});
db.createIndex({
  index: {
    fields: ['template']
  }
});
// TODO: add index for finding via slug

export default db;
