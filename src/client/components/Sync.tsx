import axios from 'axios';
import { io, Socket } from 'socket.io-client';

import { update } from '../state/docsSlice';
import { cleanStale, cleanStaleAll } from '../state/syncSlice';

import PageVisibility from 'react-page-visibility';

import { CircularProgress, IconButton, makeStyles } from '@material-ui/core';
import SyncIcon from '@material-ui/icons/Sync';
import { useEffect, useState } from 'react';

import { ClientToServerEvents, Doc, DocStub, ServerToClientEvents } from '../../shared/types';
import { Requests } from '../../server/sync/types';
import { useDispatch, useSelector } from '../store';

const debug = require('debug')('sanremo:client:sync');

require('debug').enable('sanremo:client:sync');

const BATCH_SIZE = 20;
const VISIBLE_WAIT_BUFFER = 1000 * 60;
const PERIODIC_WAIT_BUFFER = 1000 * 60 * 5;
const STALE_WAIT_BUFFER = 1000;

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
  const stale = useSelector((state) => state.sync.stale);

  const [staleHandle, setTimeoutHandle] = useState(undefined as unknown as NodeJS.Timeout);
  const [state, setState] = useState(State.idle);
  const [progress, setProgress] = useState(0);
  const [lastRan, setLastRan] = useState(0);

  const [socket, setSocket] = useState(
    undefined as unknown as Socket<ServerToClientEvents, ClientToServerEvents>
  );

  const { db } = props;

  // TODO: have a generic stale queue. It can't actually rely on the changes feed, because we need to know if
  //       the write originates from the user or from the server, as the latter shouldn't result in another server push
  // useEffect(() => {
  //   const initStaleQueue = () => {
  //     db.changes({ live: true, include_docs: true, since: 'now' }).on('change', (change) => {
  //       const doc = change.doc
  //         ? change.doc
  //         : { _id: change.id, _rev: change.changes[0].rev, _deleted: true };
  //       if (!doc._id.startsWith('_design/')) {
  //         debug(`${doc._id} is stale, queuing`);
  //         dispatch(markStale(doc));
  //       }
  //     });
  //   };

  //   initStaleQueue();
  // }, [db, dispatch]);

  useEffect(() => {
    const processStaleQueue = () => {
      if (!Object.values(stale).length) {
        return;
      }

      debug(`${Object.values(stale).length} stale docs, priming server update`);

      clearTimeout(staleHandle);
      setTimeoutHandle(
        setTimeout(async () => {
          const docs = Object.values(stale);
          debug(`stale server update for ${docs.length} docs`);

          socket.emit('docUpdate', docs);

          dispatch(cleanStale(docs));
        }, STALE_WAIT_BUFFER)
      );
    };
    processStaleQueue();

    // timeoutHandle changes should not fire this effect, otherwise it would be an infinite loop
    // of clearing and setting the time out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stale]);

  useEffect(() => {
    const initSocket = () => {
      debug('initializing server socket');
      setSocket(io());
    };
    initSocket();
  }, []);

  useEffect(() => {
    const handleIncomingSocket = () => {
      socket.on('docUpdate', async (docs) => {
        debug('got update from socket');

        const { writes, deletes } = splitDeletes(docs);

        // TODO: do these in parallel
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
    };
    if (socket) {
      handleIncomingSocket();
    }
  }, [db, socket, dispatch]);

  const handleFullSync = async function () {
    if (state === State.idle) {
      try {
        debug('starting full sync');
        setState(State.syncing);
        setProgress(0);
        // wipe the stale queue
        clearTimeout(staleHandle);
        dispatch(cleanStaleAll());

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

            // TODO: do these writes in parallel
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
    const periodicFullSync = () => {
      debug('app booted, syncing');
      handleFullSync();

      setInterval(() => {
        const since = Date.now() - lastRan;
        if (since > PERIODIC_WAIT_BUFFER) {
          debug(`app waited, ${since / 1000} seconds since last sync, syncing`);
          handleFullSync();
        } else {
          debug(`app waited, only ${since / 1000} seconds since last sync, not syncing`);
        }
      }, PERIODIC_WAIT_BUFFER);
    };
    periodicFullSync();
    // we want this to be run once
    // FIXME: work out how to put handleFullSync in deps as that's probably more correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVisibilityChange = async function (isVisible: boolean) {
    if (isVisible) {
      const since = Date.now() - lastRan;
      if (since > VISIBLE_WAIT_BUFFER) {
        debug(`app visible, ${since / 1000} seconds since last sync, syncing`);
        handleFullSync();
      } else {
        debug(`app visible, only ${since / 1000} seconds since last sync, not syncing`);
      }
    }
  };

  return (
    <PageVisibility onChange={handleVisibilityChange}>
      <IconButton color="inherit" onClick={handleFullSync}>
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
