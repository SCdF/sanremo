import axios from 'axios';

import { update } from '../state/docsSlice';
import { useDispatch } from 'react-redux';

import PageVisibility from 'react-page-visibility';

import { CircularProgress, IconButton, makeStyles } from '@material-ui/core';
import SyncIcon from '@material-ui/icons/Sync';
import { useEffect, useState } from 'react';

import { Doc, DocStub } from '../../server/types';
import { Requests } from '../../server/sync/types';

const debug = require('debug')('sanremo:client:sync');

require('debug').enable('sanremo:client:sync');

const BATCH_SIZE = 20;
const VISIBLE_WAIT_BUFFER = 1000 * 60; // one minute
const PERIODIC_WAIT_BUFFER = 1000 * 60 * 5; // five minutes

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
  const dispatch = useDispatch();
  const [state, setState] = useState(State.idle);
  const [progress, setProgress] = useState(0);
  const [lastRan, setLastRan] = useState(0);

  const { db } = props;

  const handleSync = async function () {
    if (state === State.idle) {
      try {
        debug('starting sync');
        setState(State.syncing);
        setProgress(0);

        // Get the docs we have locally. The only way to see deleted documents with PouchDB
        // is with the changes feed to get all ids, then pass them as keys to allDocs
        const changes = await db.changes({
          // since: 0,
        });
        const stubs: DocStub[] = changes.results
          .filter((row) => !row.id.startsWith('_design/'))
          .map((row) => {
            return {
              _id: row.id,
              // FIXME: work out if I ever need to care about more than one change
              _rev: row.changes[0].rev,
              _deleted: row.deleted,
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
        debug(
          `the server needs ${serverState.server.length}, we need ${serverState.client.length}`
        );

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
                docs: result.rows.map(
                  (r) => r.doc || { _id: r.id, _rev: r.value.rev, _deleted: r.value.deleted }
                ),
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

            dispatch(update(result));
            debug('<- state updated');

            docCount += batch.length;
            updateProgress();
          }
        }
      } catch (e) {
        console.error('Failed to sync', e);
        // TODO: set sad icon here? (with sync action still attached)
      } finally {
        debug('finished');
        // TODO: set finished icon here, that changes to idle after a time
        setState(State.idle);
        // TODO: maybe only if it completed successfully?
        setLastRan(Date.now());
      }
    } else {
      // TODO: cancel here? Differentiate between automated and manual
    }
  };

  useEffect(() => {
    debug('app booted, syncing');
    handleSync();

    setInterval(() => {
      const since = Date.now() - lastRan;
      if (since > PERIODIC_WAIT_BUFFER) {
        debug(`app waited, ${since / 1000} seconds since last sync, syncing`);
        handleSync();
      } else {
        debug(`app waited, only ${since / 1000} seconds since last sync, not syncing`);
      }
    }, PERIODIC_WAIT_BUFFER);
    // we want this to be run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVisibilityChange = async function (isVisible: boolean) {
    if (isVisible) {
      const since = Date.now() - lastRan;
      if (since > VISIBLE_WAIT_BUFFER) {
        debug(`app visible, ${since / 1000} seconds since last sync, syncing`);
        handleSync();
      } else {
        debug(`app visible, only ${since / 1000} seconds since last sync, not syncing`);
      }
    }
  };

  return (
    <PageVisibility onChange={handleVisibilityChange}>
      <IconButton color="inherit" onClick={handleSync}>
        <SyncIcon />
        {state === State.syncing && (
          <CircularProgress color="secondary" className={classes.progress} size="30px" />
        )}
        {state === State.syncing && (
          <CircularProgress
            color="secondary"
            variant="determinate"
            value={progress}
            className={classes.progress}
          />
        )}
      </IconButton>
    </PageVisibility>
  );
}

export default Sync;
