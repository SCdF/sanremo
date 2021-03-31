import { useEffect, useState } from "react";
import { Button, Divider, List, ListItem, Typography } from "@material-ui/core";
import { makeStyles } from '@material-ui/core/styles';

import Page from "../components/Page";

import RepeatableListItem from "../components/RepeatableListItem";
import TemplateListItem from "../components/TemplateListItem";

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
  const [repeatables, setRepeatables] = useState([]);

  // NB: this code also exists in History.js using completed instead of updated
  useEffect(() => {
    async function go() {
      const {docs: repeatables} = await db.find({
        selector: {
          _id: {$gt: 'repeatable:instance:', $lte: 'repeatable:instance:\uffff'},
          completed: {$exists: false}
        },
        fields: ['_id', 'template', `updated`, 'slug'],
        // FIXME: there is a bug / missing feature in PouchDB where you sort won't work in this
        // situation because the query planner decides to use the default index, presumably because
        // sort doesn't match the selector (as written here it uses a [_id, completed] index).
        // We should see what CouchDB does in this situation and make sure it's the same
        // sort: [{updated: 'desc'}]
      });

      // Replace template id with real thing
      const templateIds = [...new Set(repeatables.map(d => d.template))];
      const {docs: templates} = await db.find({
        selector: {
          _id: {
            $in: templateIds
          }
        },
        fields: ['_id', 'title', 'slug.type']
      });
      const templateMap = new Map(templates.map(t => [t._id, t]));
      repeatables.forEach(r => {
        r.timestamp = r.updated;
        delete r.updated;
        r.template = templateMap.get(r.template);
      });

      // As the FIXME: mentions above, sort manually
      setRepeatables(repeatables.sort((d1, d2) => d2.timestamp - d1.timestamp));
    };

    // TODO: sort out logging / elevation for errors
    go();
  }, [db]);

  // TODO: sort templates in some way
  // Two options:
  // - Frequency of use (with some kind of relevancy cutoff)
  // - Date of last usage
  useEffect(() => db.find({
    selector: {_id: {$gt: 'repeatable:template:', $lte: 'repeatable:template:\uffff'}},
    fields: ['_id', 'title']
  })
  .then(({docs}) => setTemplates(docs)), [db]);

  const templateList = templates.map(template =>
    <TemplateListItem key={template._id} className={classes.horizontal} {...template} />
  );

  const repeatableList = repeatables.map(repeatable =>
    <RepeatableListItem key={repeatable._id} {...repeatable} />
  );

  return (
    <Page title='Checklists' under='home'>
      { !!repeatableList.length && <List className="repeatables">{repeatableList}</List> }
      { !!!repeatableList.length &&
          <Typography align='center' variant='body2' className={classes.root}>
            Click on a template below to get started.
          </Typography>
      }
      <Divider />
      <List className="templates">
        {templateList}
        <ListItem key="new">
          <Button href="/template/new" component="button">New</Button>
        </ListItem>
      </List>
    </Page>
  );
};

export default Home;
