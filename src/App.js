import './App.scss';
import React, { useEffect, useState } from 'react';
import { navigate, Router, Link } from "@reach/router"

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
    }]

    db.bulkDocs(TEMP_DATA);
  };

})();
// TEMP data check

function Home() {
  const [templates, setTemplates] = useState([]);
  const [activeChecklists, setActiveChecklists] = useState([]);
  const [completeChecklists, setCompleteChecklists] = useState([]);

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
      fields: ['_id', 'title', 'template']
    }).then(({docs}) => setActiveChecklists(docs)), []);

  useEffect(() => db.find({
    selector: {
      _id: {$gt: 'checklist:instance:', $lte: 'checklist:instance:\uffff'},
      completed: {$exists: true}
    },
    fields: ['_id', 'title', 'template']
  }).then(({docs}) => setCompleteChecklists(docs)), []);

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
      <Link to={`/checklist/${checklist.template}/${checklist._id}`}>
        {checklist.title}
      </Link>
    </li>
  );

  const completeList = completeChecklists.map(checklist => 
    <li key={checklist._id}>
      <Link to={`/checklist/${checklist.template}/${checklist._id}`}>
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
    <section>
      <h1>Completed checklists</h1>
      <ul className='App-checklist-list'>{completeList}</ul>
    </section>
  </main>;
};

function Checklist(props) {
  const [checklist, setChecklist] = useState({});

  async function handleInputChange(e) {
    const item = checklist.items.find(i => i._id === e.target.name);
    // TODO: why does handleInputChange get called twice?
    // Is this me using React incorrectly, or HTML being HTML, or something else?
    if (item.checked !== e.target.checked) {
      const now = Date.now();
      const updatedChecklist = Object.assign({}, checklist);

      item.checked = e.target.checked;
      updatedChecklist.updated = now;
      
      const completed = updatedChecklist.items.every(i => i.checked);
      if (completed) {
        updatedChecklist.completed = now;
      } else {
        delete updatedChecklist.completed;
      }

      const {rev} = await db.put(updatedChecklist);
      updatedChecklist._rev = rev;
      
      setChecklist(updatedChecklist);
    }
  }

  async function deleteChecklist() {
    await db.remove(checklist);

    navigate('/');
  }

  useEffect(() => db.get(props.checklistId)
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }

      return db.get(props.templateId)
        .then(template => {
          const checklist = Object.assign({}, template);
          checklist._id = props.checklistId;
          checklist.template = template._id;
          delete checklist._rev;
          checklist.created = Date.now();

          return db.put(checklist)
            .then(({rev}) => {
              checklist._rev = rev;
              return checklist;
            })
        });
    })
    .then(checklist => setChecklist(checklist)), [props.checklistId, props.templateId]);
  

  let items = [];
  if (checklist && checklist.items) {
    items = checklist.items.map(item => {
      const {_id: id, text} = item;
      return <li key={id}>
        <label className='strikethrough'>
          <input type='checkbox' name={id} checked={item.checked} onChange={handleInputChange}/>
          {text}
        </label>
      </li>
    });
  }

  return <div>
    <header className={checklist.completed && 'strikethrough'}>{checklist && checklist.title}</header>
    <ol>{items}</ol>
    <button onClick={deleteChecklist}>Delete</button>
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
        {/* 
          do we really want checklists to contain the template id in their url? why? 
          We need them ATM because Checklist creates itself (and so needs the template 
          id to clone), but we should fix that too!
          */}
        <Checklist path='checklist/:templateId/:checklistId'/>
      </Router>
    </div>
  );   
}

export default App;
