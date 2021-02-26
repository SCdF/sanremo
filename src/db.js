import { v4 as uuid } from 'uuid';

import PouchDB from "pouchdb-browser";
import pdbFind from "pouchdb-find";
PouchDB.plugin(pdbFind);

const db = new PouchDB('sanremo');

// TODO: probably drop this, or work out a more react way of accessing it from the console
window.DB = db;

// TEMP data check
(async function () {
  console.log('TEMP data check');
  const templates = await db.find({
    selector: { _id: { $gt: 'checklist:template:' } }
  });

  if (!templates?.docs.length) {
    console.log('No temp data found, adding');
    const TEMP_DATA = [{
      _id: `checklist:template:${uuid()}`,
      title: 'Wrist Stretches',
      items: [
        { _id: uuid(), checked: false, text: '20x rotate CW' },
        { _id: uuid(), checked: false, text: '20x rotate CCW' },
        { _id: uuid(), checked: false, text: '20x rotate CW' },
        { _id: uuid(), checked: false, text: '20x rotate CCW' },
        { _id: uuid(), checked: false, text: '20x rotate CW' },
        { _id: uuid(), checked: false, text: '20x rotate CCW' },
        { _id: uuid(), checked: false, text: '10x10s ball squeeze' },
        { _id: uuid(), checked: false, text: '10x10s ball squeeze' },
        { _id: uuid(), checked: false, text: '10x10s ball squeeze' },
        { _id: uuid(), checked: false, text: '10x10s band stretch' },
        { _id: uuid(), checked: false, text: '10x10s band stretch' },
        { _id: uuid(), checked: false, text: '10x10s band stretch' },
      ]
    },
    {
      _id: `checklist:template:${uuid()}`,
      title: 'Before you push to Github',
      items: [
        { _id: uuid(), checked: false, text: 'Does ESLint pass?' },
        { _id: uuid(), checked: false, text: 'Have you covered your new functionality with unit tests?' },
        { _id: uuid(), checked: false, text: 'How about integration tests?' },
      ]
    }];

    db.bulkDocs(TEMP_DATA);
  };

})();
// TEMP data check

// TODO: move this somewhere less stupid (this will be stupid once we're syncing with a remote server probably)
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

export default db;
