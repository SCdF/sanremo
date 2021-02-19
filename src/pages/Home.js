import { Link } from "@reach/router";
import { useContext, useEffect, useState } from "react";
import Page from "../components/Page";

import { v4 as uuid } from 'uuid';
import {DbContext} from "../contexts/db";
import ChecklistItem from "../components/ChecklistItem";
import { List, ListItem, ListItemText, ListSubheader } from "@material-ui/core";

function Home(props) {
  const db = useContext(DbContext);

  const [templates, setTemplates] = useState([]);
  const [activeChecklists, setActiveChecklists] = useState([]);
  const [completeChecklists, setCompleteChecklists] = useState([]);

  // FIXME: sort out an index creation strategy so we can use sorting etc
  useEffect(() => db.find({
      selector: {
        _id: {$gt: 'checklist:instance:', $lte: 'checklist:instance:\uffff'},
        completed: {$exists: false}
      },
      fields: ['_id', 'title', 'template', 'updated'],
      // sort: [{updated: 'desc'}]
    }).then(({docs}) => setActiveChecklists(docs.sort((d1, d2) => d2.updated - d1.updated ))), [db]);

  useEffect(() => db.find({
    selector: {
      _id: {$gt: 'checklist:instance:', $lte: 'checklist:instance:\uffff'},
      completed: {$exists: true}
    },
    fields: ['_id', 'title', 'template', 'completed'],
    // sort: [{completed: 'desc'}]
  }).then(({docs}) => setCompleteChecklists(docs.sort((d1, d2) => d2.completed - d1.completed))), [db]);

  useEffect(() => db.find({
    selector: {_id: {$gt: 'checklist:template:', $lte: 'checklist:template:\uffff'}},
    fields: ['_id', 'title']
  })
  .then(({docs}) => setTemplates(docs)), [db]);

  // TODO: create and redirect
  // It would be cleaner for Home to not know how to name checklists
  const templateList = templates.map(template =>
    <ListItem key={template._id}>
      <Link to={`/checklist/${template._id}/checklist:instance:${uuid()}`}>
       {template.title}
      </Link>
      <Link to={`/hacks/${template._id}/edit`}> [edit]</Link>
    </ListItem>
  );

  const checklistList = activeChecklists.map((checklist, idx) =>
    <ChecklistItem key={checklist._id} checklistStub={checklist} expanded={idx === 0} />
  );

  const completeList = completeChecklists.map(checklist =>
    <ListItem key={checklist._id}>
      <Link to={`/checklist/${checklist.template}/${checklist._id}`}>
        {checklist.title}
      </Link>
    </ListItem>
  );

  return (
    <Page title='Sanremo'>
      <List subheader={<li />}>
        <li key='section-active-checklists'>
          <ul className='App-checklist-list'>
            <ListSubheader>Active checklists</ListSubheader>
            {checklistList}
            </ul>
        </li>
        <li key='section-templates'>
          <ul className='App-checklist-list'>
            <ListSubheader>Templates</ListSubheader>
            {templateList}
            </ul>
        </li>
        <li key='section-completed-checklists'>
          <ul className='App-checklist-list'>
            <ListSubheader>Completed checklists</ListSubheader>
            {completeList}
            </ul>
        </li>
      </List>
    </Page>
  );
};

export default Home;
