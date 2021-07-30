import axios from 'axios';

import { CircularProgress, IconButton, makeStyles } from '@material-ui/core';
import SyncIcon from '@material-ui/icons/Sync';
import { useState } from 'react';

import { Doc, DocStub } from '../../server/types';
import { Requests } from '../../server/sync/types';

const debug = require('debug')('sanremo:client:sync');

require('debug').enable('sanremo:client:sync');

const BATCH_SIZE = 20;
enum State {
  idle,
  syncing,
}

const useStyles = makeStyles((theme) => ({
  progress: {
    position: 'absolute',
  },
}));

function Sync(props: { db: PouchDB.Database }) {
  const classes = useStyles();
  const [state, setState] = useState(State.idle);
  const [progress, setProgress] = useState(0);

  const { db } = props;

  const handleSync = async function () {
    if (state === State.idle) {
      try {
        debug('starting sync');
        setState(State.syncing);
        setProgress(0);

        // Get the docs we have locally
        const docs = await db.allDocs();
        const stubs: DocStub[] = docs.rows
          .filter((row) => !row.id.startsWith('_design/'))
          .map((row) => {
            return {
              _id: row.id,
              _rev: row.value.rev,
              _deleted: row.value.deleted,
            };
          });
        debug(`locally we have ${stubs.length} docs`);

        // Work out the difference between us and the server
        debug('checking with the server');
        const serverState: Requests = await axios
          .post('/api/sync/declare', {
            docs: stubs,
          })
          .then(({ data }) => data);
        debug(`the server needs ${serverState.server.length}, we need ${serverState.client.length}`);

        const docTotal = serverState.client.length + serverState.server.length;
        if (docTotal > 0) {
          let docCount = 0;

          const updateProgress = () => {
            const percent = (docCount / docTotal) * 100;
            debug(`> ${percent} <`);
            setProgress(percent);
          };

          debug('starting transfers');
          updateProgress();

          // Give the server what they need
          while (serverState.server.length > 0) {
            const batch = serverState.server.splice(0, BATCH_SIZE);
            debug(`-> preparing ${batch.length}`);

            const result = await db.allDocs({
              include_docs: true,
              keys: batch.map((d) => d._id),
            });
            debug('-> got local');

            await axios
              .post('/api/sync/update', {
                docs: result.rows.map((r) => r.doc),
              })
              .then(({ data }) => data);
            debug('-> sent');

            docCount += batch.length;
            updateProgress();
          }

          // Get what we need from the server
          while (serverState.client.length > 0) {
            const batch = serverState.client.splice(0, BATCH_SIZE);
            debug(`<- preparing ${batch.length}`);

            const result: Doc[] = await axios
              .post('/api/sync/request', {
                docs: batch,
              })
              .then(({ data }) => data);
            debug('<- got server');

            await db.bulkDocs(result, {
              new_edits: false,
            });
            debug('<- stored');

            docCount += batch.length;
            updateProgress();
          }
        }
      } catch (e) {
        console.error('Failed to sync', e);
        // TODO: set sad icon here? (with sync action still attached)
      } finally {
        debug('finished');
        setState(State.idle);
      }
    } else {
      // TODO: cancel here?
    }
  };

  return (
    <IconButton color="inherit" onClick={handleSync}>
      <SyncIcon />
      {state === State.syncing && <CircularProgress color="secondary" className={classes.progress} size="30px" />}
      {state === State.syncing && (
        <CircularProgress color="secondary" variant="determinate" value={progress} className={classes.progress} />
      )}
    </IconButton>
  );
}

export default Sync;
