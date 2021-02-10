import './App.scss';
import React, { useEffect, useState } from 'react';
import { Router, Link } from "@reach/router"

import PouchDB from "pouchdb";
import pdbFind from "pouchdb-find";
import { v4 as uuid } from 'uuid';

PouchDB.plugin(pdbFind);

const db = new PouchDB('sanremo');

// TEMP data check
(async function() {
  console.log('TEMP data check');
  const templates = await db.find({
    selector: {_id: {$gt: 'checklist:template:'}}
  });

  if (!templates || !templates.docs.length) {
    console.log('No temp data found, adding');
    const TEMP_DATA = [{
      _id: `checklist:template:${uuid()}`,
      title: 'Wrist Stretches',
      items: [
        { _id: uuid(), text: '20x rotate CW' },
        { _id: uuid(), text: '20x rotate CCW' },
        { _id: uuid(), text: '20x rotate CW' },
        { _id: uuid(), text: '20x rotate CCW' },
        { _id: uuid(), text: '20x rotate CW' },
        { _id: uuid(), text: '20x rotate CCW' },
        { _id: uuid(), text: '10x10s ball squeeze' },
        { _id: uuid(), text: '10x10s ball squeeze' },
        { _id: uuid(), text: '10x10s ball squeeze' },
        { _id: uuid(), text: '10x10s band stretch' },
        { _id: uuid(), text: '10x10s band stretch' },
        { _id: uuid(), text: '10x10s band stretch' },
      ]
    },
    {
      _id: `checklist:template:${uuid()}`,
      title: 'Before you push to Github',
      items: [
        { _id: uuid(), text: 'Does ESLint pass?' },
        { _id: uuid(), text: 'Have you covered your new functionality with unit tests?' },
        { _id: uuid(), text: 'How about integration tests?' },
      ]
    }]

    db.bulkDocs(TEMP_DATA);
  };

})();
// TEMP data check

function Home() {
  const [templates, setTemplates] = useState([]);
  const [activeChecklists, setActiveChecklists] = useState([]);

  useEffect(() => db.find({
      selector: {_id: {$gt: 'checklist:template:', $lte: 'checklist:template:\uffff'}},
      fields: ['_id', 'title']
    })
    .then(({docs}) => setTemplates(docs)), []);

  useEffect(() => db.find({
      selector: {
        _id: {$gt: 'checklist:instance:', $lte: 'checklist:instance:\uffff'},
        completed: {$exists: false}
      },
      fields: ['_id', 'title', 'templateId']
    }).then(({docs}) => setActiveChecklists(docs)), []);

  // TODO: create and redirect
  // It would be cleaner for Home to not know how to name checklists
  const templateList = templates.map(template => 
    <li key={template._id}>
      <Link to={`/checklist/${template._id}/checklist:instance:${uuid()}`}>
       {template.title}
      </Link>
    </li>
  );

  const checklistList = activeChecklists.map(checklist => 
    <li key={checklist._id}>
      <Link to={`/checklist/${checklist.templateId}/${checklist._id}`}>
        {checklist.title}
      </Link>
    </li>
  );

  return <main>
    <section>
      <h1>Active checklists</h1>
      <ul className='App-checklist-list'>{checklistList}</ul>
    </section>
    <section>
      <h1>Templates</h1>
      <ul className='App-checklist-list'>{templateList}</ul>
    </section>
  </main>;
};

function Checklist(props) {
  const [checklist, setChecklist] = useState({});

  useEffect(() => db.get(props.checklistId)
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }

      return db.get(props.templateId)
        .then(template => {
          const checklist = Object.assign({}, template);
          checklist._id = props.checklistId;
          delete checklist._rev;
          checklist.created = Date.now();

          return db.put(checklist)
            .then(({rev}) => {
              checklist._rev = rev;
              return checklist;
            })
        });
    })
    .then(checklist => setChecklist(checklist)));

  let items = [];
  if (checklist && checklist.items) {
    items = checklist.items.map(item => {
      const {_id: id, text} = item;
      return <li key={id}>
        <input type='checkbox' name={id} id={id}></input>
        <label htmlFor={id} className='strikethrough'>{text}</label>
      </li>
    });
  }

  return <div>
    <header>{checklist && checklist.title}</header>
    <ol>{items}</ol>
  </div>;
}

function App() {
  return (
    <div className='App'>
      <header className='App-header'>
        <Link to='/'>Sanremo</Link>
      </header>
      <Router>
        <Home path='/' />
        <Checklist path='checklist/:templateId/:checklistId'/>
      </Router>
    </div>
  );   
}

export default App;
