import { Divider, List, Typography } from '@mui/material';
import { Fragment, useEffect, useState } from 'react';
import type { RepeatableDoc, TemplateDoc } from '../../shared/types';
import db from '../db';
import { usePageContext } from '../features/Page/pageSlice';
import RepeatableListItem from '../features/Repeatable/RepeatableListItem';
import TemplateListItem from '../features/Template/TemplateListItem';
import { useSelector } from '../store';

export type SortableRepeatableDoc = Omit<RepeatableDoc, 'template'> & {
  timestamp?: number;
  updated?: string; // so we can delete it TODO work out why we are deleting it
  template: string | TemplateDoc | undefined; // FIXME: don't overload like this
};

function Home() {
  usePageContext({ title: 'Repeatable Checklists', under: 'home' });

  const user = useSelector((state) => state.user.value);
  const handle = db(user);

  // we don't actually care about this value, we just use it to trigger list reloading
  const lastSynced = useSelector((state) => state.docs.lastSynced);

  const [templates, setTemplates] = useState([] as TemplateDoc[]);
  const [repeatables, setRepeatables] = useState([] as SortableRepeatableDoc[]);

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
        limit: 1000, // PouchDB 9+ requires explicit limit (default is 25)
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
        limit: 1000, // PouchDB 9+ requires explicit limit (default is 25)
      })) as { docs: TemplateDoc[] };

      const templateMap = new Map(templates.map((t) => [t._id, t]));
      for (const r of repeatables) {
        r.timestamp = r.updated;
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
        limit: 1000, // PouchDB 9+ requires explicit limit (default is 25)
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
      {!!repeatableList.length && (
        <List className="repeatables" data-testid="home-repeatables-list">
          {repeatableList}
        </List>
      )}
      {!repeatableList.length && (
        <Typography align="center" variant="body2" sx={{ padding: 1 }}>
          You're free! For now&hellip;
        </Typography>
      )}
      <Divider />
      <List className="templates" data-testid="home-templates-list">
        {templateList}
        <TemplateListItem key="new" />
      </List>
    </Fragment>
  );
}

export default Home;
