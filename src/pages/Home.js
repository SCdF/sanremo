import { Link } from "@reach/router";
import { useEffect, useState } from "react";
import Page from "../components/Page";

import { v4 as uuid } from 'uuid';

function Home(props) {
  const { db } = props;

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
      <Link to={`/hacks/${template._id}/edit`}> [edit]</Link>
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

  return (
    <Page title='Sanremo'>
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
    </Page>
  );
};

export default Home;