import { useContext, useEffect, useState } from "react";
import Page from "../components/Page";

import {DbContext} from "../contexts/db";
import ChecklistItem from "../components/ChecklistItem";
import TemplateItem from "../components/TemplateItem";

import { List, ListItem, ListSubheader } from "@material-ui/core";
import { makeStyles } from '@material-ui/core/styles';

// TODO: this does nothing, leaving it as an example for when we start using styling properly
const useStyles = makeStyles(() => ({
  horizontal: {
    display: 'flex'
  }
}));

function Home(props) {
  const db = useContext(DbContext);
  const classes = useStyles();

  const [templates, setTemplates] = useState([]);
  const [activeChecklists, setActiveChecklists] = useState([]);

  // FIXME: sort out an index creation strategy so we can use sorting etc
  useEffect(() => db.find({
      selector: {
        _id: {$gt: 'checklist:instance:', $lte: 'checklist:instance:\uffff'},
        completed: {$exists: false}
      },
      fields: ['_id', 'title', 'updated'],
      // sort: [{updated: 'desc'}]
    }).then(({docs}) => setActiveChecklists(docs.sort((d1, d2) => d2.updated - d1.updated ))), [db]);

  useEffect(() => db.find({
    selector: {_id: {$gt: 'checklist:template:', $lte: 'checklist:template:\uffff'}},
    fields: ['_id', 'title']
  })
  .then(({docs}) => setTemplates(docs)), [db]);

  const templateList = templates.map(template =>
    <ListItem className={classes.horizontal} key={template._id}><TemplateItem template={template} /></ListItem>);

  const checklistList = activeChecklists.map(checklist =>
    <ChecklistItem key={checklist._id} checklistStub={checklist} />
  );

  return (
    <Page title='Sanremo'>
      <List subheader={<li />}>
        <li key='section-active-checklists'>
          <ul>
            <ListSubheader>Active checklists</ListSubheader>
            {checklistList}
            </ul>
        </li>
        <li key='section-templates'>
          <ul>
            <ListSubheader>Templates</ListSubheader>
            {templateList}
            </ul>
        </li>
      </List>
    </Page>
  );
};

export default Home;
