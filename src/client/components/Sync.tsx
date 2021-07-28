import axios from 'axios';

import { CircularProgress, IconButton } from '@material-ui/core';
import SyncIcon from '@material-ui/icons/Sync';
import { useState } from 'react';
import { DocStub } from '../../server/types';
import { Requests } from '../../server/sync/types';

enum State {
  idle,
  syncing,
}

function Sync(props: { db: PouchDB.Database }) {
  const [state, setState] = useState(State.idle);
  const [progress, setProgress] = useState(null);

  const { db } = props;

  const handleSync = async function () {
    if (state === State.idle) {
      setState(State.syncing);

      const docs = await db.allDocs();
      const stubs: DocStub[] = docs.rows.map((row) => {
        return {
          _id: row.id,
          _rev: row.value.rev,
          _deleted: row.value.deleted,
        };
      });

      const serverState: Requests = await axios.post('/api/sync/declare', {
        docs: stubs,
      });

      const docTotal = serverState.client.length + serverState.server.length;
      let docCount = 0;
    } else {
      // TODO: cancel here?
    }
  };

  return (
    <IconButton color="inherit" onClick={handleSync}>
      {state === State.idle && <SyncIcon />}
      {state === State.syncing && <CircularProgress color="secondary" />}
    </IconButton>
  );
}

export default Sync;
