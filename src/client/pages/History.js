import { useEffect, useState } from 'react';

import { List } from '@material-ui/core';

import { set as setContext } from '../state/pageSlice';

import RepeatableListItem from '../components/RepeatableListItem';
import { useDispatch, useSelector } from '../store';

function History(props) {
  const [repeatables, setRepeatables] = useState([]);
  const dispatch = useDispatch();

  const { db } = props;

  // we don't actually care about this value, we just use it to trigger list reloading
  const lastSynced = useSelector((state) => state.docs.lastSynced);

  useEffect(() => {
    dispatch(
      setContext({
        title: 'History',
        under: 'history',
      })
    );
  }, [dispatch]);

  // NB: this code also exists in Home.js using updated instead of completed
  useEffect(() => {
    async function go() {
      const { docs: repeatables } = await db.find({
        selector: {
          _id: { $gt: 'repeatable:instance:', $lte: 'repeatable:instance:\uffff' },
          completed: { $exists: true },
        },
        fields: ['_id', 'template', `completed`, 'slug'],
        // FIXME: there is a bug / missing feature in PouchDB where you sort won't work in this
        // situation because the query planner decides to use the default index, presumably because
        // sort doesn't match the selector (as written here it uses a [_id, completed] index).
        // We should see what CouchDB does in this situation and make sure it's the same
        // sort: [{completed: 'desc'}]
      });

      // Replace template id with real thing
      const templateIds = [...new Set(repeatables.map((d) => d.template))];
      const { docs: templates } = await db.find({
        selector: {
          _id: {
            $in: templateIds,
          },
        },
        fields: ['_id', 'title', 'slug.type'],
      });
      const templateMap = new Map(templates.map((t) => [t._id, t]));
      repeatables.forEach((r) => {
        r.timestamp = r.completed;
        delete r.completed;
        r.template = templateMap.get(r.template);
      });

      // As the FIXME: mentions above, sort manually
      setRepeatables(repeatables.sort((d1, d2) => d2.timestamp - d1.timestamp));
    }

    // TODO: sort out logging / elevation for errors
    go();
  }, [db, lastSynced]);

  const repeatableList = repeatables.map((repeatable) => (
    <RepeatableListItem key={repeatable._id} {...repeatable} />
  ));

  return <List>{repeatableList}</List>;
}

export default History;
