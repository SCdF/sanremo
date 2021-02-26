import { useEffect, useState } from "react";
import { Divider, List, ListItem, Typography } from "@material-ui/core";
import { makeStyles } from '@material-ui/core/styles';

import Page from "../components/Page";

import ChecklistItem from "../components/ChecklistItem";
import TemplateItem from "../components/TemplateItem";

const useStyles = makeStyles((theme) => ({
  horizontal: {
    display: 'inline-block',
    'padding-right': 0,
    width: 'auto'
  },
  root: {
    padding: theme.spacing(1)
  }
}));

function Home(props) {
  const classes = useStyles();

  const { db } = props;

  const [templates, setTemplates] = useState([]);
  const [activeChecklists, setActiveChecklists] = useState([]);

  // FIXME: there is a bug / missing feature in PouchDB where you sort won't work in this
  // situation because the query planner decides to use the default index, presumably because
  // sort doesn't match the selector (as written below it uses a [_id, completed] index).
  // We should see what CouchDB does in this situation and make sure it's the same
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
    <ListItem key={template._id} className={classes.horizontal}><TemplateItem template={template} /></ListItem>);

  const checklistList = activeChecklists.map(checklist =>
    <ChecklistItem key={checklist._id} checklistStub={checklist} />
  );

  return (
    <Page title='Sanremo' under='home'>
      { !!checklistList.length && <List>{checklistList}</List> }
      { !!!checklistList.length &&
          <Typography align='center' variant='body2' className={classes.root}>
            Click on a template below to get started.
          </Typography>
      }
      <Divider />
      <List>
        {templateList}
      </List>
    </Page>
  );
};

export default Home;
