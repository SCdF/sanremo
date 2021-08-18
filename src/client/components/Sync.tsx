import axios from 'axios';
import { io, Socket } from 'socket.io-client';

import PageVisibility from 'react-page-visibility';
import { Fragment, useCallback, useEffect, useState } from 'react';

import { CircularProgress, Fade, IconButton, makeStyles, Tooltip } from '@material-ui/core';

import CloudRoundedIcon from '@material-ui/icons/CloudRounded';
import CloudDoneRoundedIcon from '@material-ui/icons/CloudDoneRounded';
import CloudOffRoundedIcon from '@material-ui/icons/CloudOffRounded';
import ErrorOutlineRoundedIcon from '@material-ui/icons/ErrorOutlineRounded';

import { ClientToServerEvents, Doc, DocStub, ServerToClientEvents } from '../../shared/types';
import { update } from '../state/docsSlice';
import { cleanStale, cleanStaleAll } from '../state/syncSlice';
import { Requests } from '../../server/sync/types';
import { useDispatch, useSelector } from '../store';
import { Database } from '../db';
import { useLocation } from 'react-router-dom';

const debug = require('debug')('sanremo:client:sync');

require('debug').enable('sanremo:client:sync');

const BATCH_SIZE = 20;
const STALE_WAIT_BUFFER = 1000;

enum State {
  /** initial, or socket is disconnected */
  disconnected,
  /** a full sync is in progress, the socket is still disconnected */
  syncing,
  /** the socket is open and waiting */
  connected,
  /** something went 'orribly wrong */
  error,
}
const useStyles = makeStyles((theme) => ({
  progress: {
    position: 'absolute',
  },
}));

async function bulkDelete(db: PouchDB.Database<{}>, deletes: Doc[]) {
  const deleteResults = await db.allDocs({ keys: deletes.map((d) => d._id) });
  const deletedDocs = deleteResults.rows.map((row) => ({
    _id: row.key,
    // If the client doesn't have this document, the row will have
    //error: "not_found"
    // and no _rev.
    _rev: row?.value?.rev,
    _deleted: true,
  }));

  await db.bulkDocs(deletedDocs);
}

function Sync(props: { db: Database }) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const stale = useSelector((state) => state.sync.stale);

  const location = useLocation();

  const [staleTimeoutHandle, setStaleTimeoutHandle] = useState(
    undefined as unknown as NodeJS.Timeout
  );
  const [state, setState] = useState(State.disconnected);
  const [error, setError] = useState(undefined as unknown as string);
  const [progress, setProgress] = useState(0);

  const [socket, setSocket] = useState(
    undefined as unknown as Socket<ServerToClientEvents, ClientToServerEvents>
  );

  const { db } = props;

  // TODO: make this work more in parallel, benchmark it to see if it makes a difference etc
  const handleFullSync = useCallback(
    async function () {
      if (state !== State.syncing) {
        try {
          debug('starting full sync');
          setState(State.syncing);
          setProgress(0);

          // wipe the stale queue, we're about to do a full sync anyway
          clearTimeout(staleTimeoutHandle);
          dispatch(cleanStaleAll());

          // Get the docs we have locally. The only way to see deleted documents with PouchDB
          // is with the changes feed to get all ids
          const changes = await db.changes();
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
            .post('/api/sync/begin', {
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
              debug(`~${percent}% complete`);
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

              await axios.post('/api/sync/update', {
                docs: result.rows.map(
                  (r) => r.doc || { _id: r.id, _rev: r.value.rev, _deleted: r.value.deleted }
                ),
              });
              debug('-> sent');

              docCount += batch.length;
              updateProgress();
            }

            // Get what we need from the server
            while (serverState.client.length > 0) {
              const batch = serverState.client.splice(0, BATCH_SIZE);
              debug(`<- preparing ${batch.length}`);

              const { deletes, writes } = splitDeletes(batch);

              if (deletes.length) {
                await bulkDelete(db, deletes);
                debug('<- deleted deletes');
              }

              const result: Doc[] = await axios
                .post('/api/sync/request', {
                  docs: writes,
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

          setState(State.connected);
        } catch (e) {
          console.error('Failed to sync', e);
          if (e.message === 'Network Error') {
            setState(State.disconnected);
          } else {
            setError(`${e.name}: ${e.message}, tap to try again`);
            setState(State.error);
          }
        } finally {
          debug('finished');
        }
      }
    },
    [db, dispatch, staleTimeoutHandle, state]
  );

  const flushStaleQueue = useCallback(async () => {
    const docs = Object.values(stale);
    // Don't try to flush the stale queue whilst it's disconnected. Otherwise you'll potentially
    // queue up a bunch of emits that contradict each other.
    if (docs.length && socket && socket.connected) {
      debug(`stale server update for ${docs.length} docs`);

      socket.emit('docUpdate', docs);
      dispatch(cleanStale(docs));
    }
  }, [dispatch, socket, stale]);

  useEffect(() => {
    const processStaleQueue = () => {
      clearTimeout(staleTimeoutHandle);

      const staleCount = Object.values(stale).length;
      if (!(socket && staleCount)) {
        return;
      }

      debug(`${staleCount} stale docs, priming server update`);

      setStaleTimeoutHandle(setTimeout(flushStaleQueue, STALE_WAIT_BUFFER));
    };

    processStaleQueue();

    // timeoutHandle changes should not fire this effect, otherwise it would be an infinite loop
    // of clearing and setting the time out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, socket, stale /*, timeoutHandle */]);

  useEffect(() => {
    const initSocket = () => {
      if (socket) {
        socket.close();
      }

      debug('initializing server socket');
      const localSocket = io();

      localSocket.on('connect', async () => {
        debug('socket connected');
        await handleFullSync();

        localSocket.emit('ready');
      });

      localSocket.on('docUpdate', async (docs) => {
        debug('got update from socket');

        const { writes, deletes } = splitDeletes(docs);

        // TODO: do these in parallel, see if it's faster
        if (deletes.length) {
          await bulkDelete(db, deletes);
        }
        if (writes.length) {
          await db.bulkDocs(writes, {
            new_edits: false,
          });
        }

        dispatch(update(docs));
      });

      localSocket.on('disconnect', () => {
        debug('socket disconnected');
        setState(State.disconnected);
      });

      setSocket(localSocket);
    };

    initSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVisibilityChange = async function (isVisible: boolean) {
    if (!isVisible) {
      clearTimeout(staleTimeoutHandle);
      await flushStaleQueue();
    }
  };

  const fadeOutConnected = state === State.connected && location.pathname !== '/about';
  return (
    <PageVisibility onChange={handleVisibilityChange}>
      {/* instantly "fade in" other states, slowly fade out connected state */}
      <Fade in={!fadeOutConnected} timeout={fadeOutConnected ? 2000 : 0}>
        <IconButton color="inherit" onClick={handleFullSync}>
          {state === State.error && (
            <Tooltip title={error}>
              <ErrorOutlineRoundedIcon />
            </Tooltip>
          )}
          {state === State.disconnected && <CloudOffRoundedIcon />}
          {state === State.syncing && (
            <Fragment>
              <CloudRoundedIcon />
              {/* inner constantly animating progress */}
              <CircularProgress color="secondary" className={classes.progress} size="33px" />
              {/* outer percentage progress */}
              <CircularProgress
                color="secondary"
                className={classes.progress}
                variant="determinate"
                value={progress}
              />
            </Fragment>
          )}
          {state === State.connected && <CloudDoneRoundedIcon />}
        </IconButton>
      </Fade>
    </PageVisibility>
  );

  // FIXME: https://github.com/pouchdb/pouchdb/issues/7841 means we have to performed deletes
  // specifically, instead of generically alongside other writes
  // This also means that the server has to treat deletes specifically, otherwise the
  // revs that increments here will cause an infinite loop with other clients. On the server
  // revs on deleted documents are ignored and they are all considered the same
  function splitDeletes(batch: Doc[]): { deletes: Doc[]; writes: Doc[] } {
    return batch.reduce(
      (acc, doc) => {
        if (doc._deleted) {
          acc.deletes.push(doc);
        } else {
          acc.writes.push(doc);
        }
        return acc;
      },
      { deletes: [] as Doc[], writes: [] as Doc[] }
    );
  }
}

export default Sync;
