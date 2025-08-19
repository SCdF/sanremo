import { Divider, List, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Fragment, useEffect, useState } from 'react';

import { set as setContext } from '../features/Page/pageSlice';

import { RepeatableDoc, TemplateDoc } from '../../shared/types';
import db from '../db';
import RepeatableListItem from '../features/Repeatable/RepeatableListItem';
import TemplateListItem from '../features/Template/TemplateListItem';
import { useDispatch, useSelector } from '../store';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(1),
  },
}));

export type SortableRepeatableDoc = Omit<RepeatableDoc, 'template'> & {
  timestamp?: number;
  updated?: string; // so we can delete it TODO work out why we are deleting it
  template: string | TemplateDoc | undefined; // FIXME: don't overload like this
};

function Home() {
  const classes = useStyles();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.user.value);
  const handle = db(user);

  // we don't actually care about this value, we just use it to trigger list reloading
  const lastSynced = useSelector((state) => state.docs.lastSynced);

  const [templates, setTemplates] = useState([] as TemplateDoc[]);
  const [repeatables, setRepeatables] = useState([] as SortableRepeatableDoc[]);

  useEffect(() => {
    dispatch(
      setContext({
        title: 'Repeatable Checklists',
        under: 'home',
      }),
    );
  }, [dispatch]);

  // NB: this code also exists in History.js using completed instead of updated
  // biome-ignore lint/correctness/useExhaustiveDependencies: TODO confirm this is OK, I think we need lastSynced as an effective "try again"
  useEffect(() => {
    async function loadRepeatables() {
      const { docs: repeatables } = (await handle.find({
        selector: {
          _id: { $gt: 'repeatable:instance:', $lte: 'repeatable:instance:\uffff' },
          completed: { $exists: false },
        },
        fields: ['_id', 'template', 'updated', 'slug'],
        // FIXME: there is a bug / missing feature in PouchDB where you sort won't work in this
        // situation because the query planner decides to use the default index, presumably because
        // sort doesn't match the selector (as written here it uses a [_id, completed] index).
        // We should see what CouchDB does in this situation and make sure it's the same
        // sort: [{updated: 'desc'}]
      })) as {
        docs: SortableRepeatableDoc[];
      };

      if (repeatables.length === 0) {
        setRepeatables([]);
        return;
      }

      // Replace template id with real thing
      const templateIds = [...new Set(repeatables.map((d) => d.template))];
      const { docs: templates } = (await handle.find({
        selector: {
          _id: {
            $in: templateIds,
          },
        },
        fields: ['_id', 'title', 'slug.type'],
      })) as { docs: TemplateDoc[] };

      const templateMap = new Map(templates.map((t) => [t._id, t]));
      for (const r of repeatables) {
        r.timestamp = r.updated;
        // biome-ignore lint/performance/noDelete: FIXME: check if we can change this
        delete r.updated;
        r.template = templateMap.get(r.template as string) as TemplateDoc;
      }

      // As the FIXME: mentions above, sort manually
      setRepeatables(repeatables.sort((d1, d2) => d2.timestamp || 0 - (d1.timestamp || 0)));
    }

    // TODO: sort out logging / elevation for errors
    loadRepeatables();
  }, [handle, lastSynced]);

  // TODO: sort templates in some better way
  // Two options:
  // - Frequency of use (with some kind of relevancy cutoff)
  // - Date of last usage
  // biome-ignore lint/correctness/useExhaustiveDependencies: TODO confirm this is OK, I think we need lastSynced as an effective "try again"
  useEffect(() => {
    const splitId = (id: string) => {
      const split = id.lastIndexOf(':');
      return [id.substring(0, split), Number(id.substring(split + 1))];
    };

    async function loadTemplates() {
      const { docs: allTemplates } = (await handle.find({
        selector: { _id: { $gt: 'repeatable:template:', $lte: 'repeatable:template:\uffff' } },
        fields: ['_id', 'title', 'deleted'],
      })) as {
        docs: PouchDB.Core.ExistingDocument<TemplateDoc>[];
      };

      const latestTemplateByRoot: Record<string, TemplateDoc> = {};
      for (const template of allTemplates) {
        const [rootId, tVersion] = splitId(template._id);

        const existing = latestTemplateByRoot[rootId];
        if (existing) {
          const [, eVersion] = splitId(existing._id);

          if (eVersion > tVersion) {
            continue;
          }
        }

        latestTemplateByRoot[rootId] = template;
      }

      // We are using `deleted` (no underscore) as a soft delete, for when the user deletes a
      // template but has instances against it already.
      const latestTemplates = Object.values(latestTemplateByRoot).filter((t) => !t.deleted);

      latestTemplates.sort((l, r) => (l.title > r.title ? 1 : -1));

      setTemplates(latestTemplates);
    }

    loadTemplates();
  }, [handle, lastSynced]);

  const templateList = templates.map((template) => (
    <TemplateListItem key={template._id} {...template} />
  ));

  const repeatableList = repeatables.map((repeatable) => (
    <RepeatableListItem key={repeatable._id} {...repeatable} />
  ));

  return (
    <Fragment>
      {!!repeatableList.length && <List className="repeatables">{repeatableList}</List>}
      {!repeatableList.length && (
        <Typography align="center" variant="body2" className={classes.root}>
          You're free! For now&hellip;
        </Typography>
      )}
      <Divider />
      <List className="templates">
        {templateList}
        <TemplateListItem key="new" />
      </List>
    </Fragment>
  );
}

export default Home;
