import migrate004 from './0.0.4';

// FIXME: make setup blocking, move the Migration feature logic into happening here, put setup behind the progress bar
export default function setup(db: PouchDB.Database) {
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

  db.changes({ live: true, conflicts: true, include_docs: true }).on('change', (change) => {
    if (change.doc?._conflicts?.length) {
      console.error(`Conflict detected in write to ${db.name}`, change);
    }
  });

  migrate004(db);
}
