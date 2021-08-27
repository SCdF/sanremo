import axios from 'axios';
import { io, Socket } from 'socket.io-client';

import { useEffect, useState } from 'react';

import { ClientToServerEvents, Doc, DocStub, ServerToClientEvents } from '../../../shared/types';
import { update } from '../../state/docsSlice';
import {
  cleanStale,
  completeSync,
  requestSync,
  socketConnected,
  socketDisconnected,
  startSync,
  State,
  syncError,
  updateProgress,
} from './syncSlice';
import { Requests } from '../../../server/sync/types';
import { useDispatch, useSelector } from '../../store';
import { Database } from '../../db';

const debug = require('debug')('sanremo:client:sync');

const BATCH_SIZE = 20;

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

async function writesFromRemote(db: Database, writes: Doc[]) {
  // To avoid conflicts, AND to write the exact rev we're given, we need both write with
  // `new_edits: false` so we get to specify any _rev we want, AND delete any "conflicts".
  // Unfortunately, `new_edits: false` always creates conflicts, so we preemptively delete
  // the docs and then re-write them with their correct data and remote _rev
  await deletesFromRemote(db, writes);

  await db.bulkDocs(writes, {
    new_edits: false,
  });
}

async function deletesFromRemote(db: Database, deletes: Doc[]) {
  const deleteResults = await db.allDocs({ keys: deletes.map((d) => d._id) });
  const deletedDocs = deleteResults.rows.map((row) => ({
    _id: row.key,
    // If the client doesn't have this document, the row will have
    //error: "not_found"
    // and no _rev. No _rev is okay, pouch will create one
    _rev: row?.value?.rev,
    _deleted: true,
  }));

  await db.bulkDocs(deletedDocs);
}

function SyncManager(props: { db: Database }) {
  const dispatch = useDispatch();

  const stale = useSelector((state) => state.sync.stale);
  const state = useSelector((state) => state.sync.state);

  const [socket, setSocket] = useState(
    undefined as unknown as Socket<ServerToClientEvents, ClientToServerEvents>
  );

  const { db } = props;

  useEffect(() => {
    // TODO: make this work more in parallel, benchmark it to see if it makes a difference etc
    const handleFullSync = async function () {
      try {
        // Get the docs we have locally. The only way to see deleted documents with PouchDB
        // is with the changes feed to get all ids
        const changes = await db.changes({ filter: (d: Doc) => !d._id.startsWith('_design/') });
        const stubs: DocStub[] = changes.results.map((row) => {
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

          debug('starting transfers');
          dispatch(updateProgress({ count: docCount, total: docTotal }));

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
            dispatch(updateProgress({ count: docCount, total: docTotal }));
          }

          // Get what we need from the server
          while (serverState.client.length > 0) {
            const batch = serverState.client.splice(0, BATCH_SIZE);
            debug(`<- preparing ${batch.length}`);

            const { deletes, writes } = splitDeletes(batch);

            let changes: Doc[] = [];
            if (deletes.length) {
              await deletesFromRemote(db, deletes);
              changes = changes.concat(deletes);
              debug('<- deleted deletes');
            }

            if (writes.length) {
              const result: Doc[] = await axios
                .post('/api/sync/request', {
                  docs: writes,
                })
                .then(({ data }) => data);
              debug('<- got server');

              await writesFromRemote(db, result);
              debug('<- stored');

              changes = changes.concat(result);
            }

            dispatch(update(changes));
            debug('<- state updated');

            docCount += batch.length;
            dispatch(updateProgress({ count: docCount, total: docTotal }));
          }
        }

        dispatch(completeSync());
      } catch (e) {
        console.error('Failed to sync', e);
        dispatch(syncError(e));
      } finally {
        debug('finished');
      }
    };

    if (state === State.requested) {
      debug('starting full sync');
      dispatch(startSync());
      handleFullSync();
    }
  }, [db, dispatch, state]);

  useEffect(() => {
    const processStaleQueue = () => {
      const docs = Object.values(stale);
      // Don't emit if we're disconnected. Otherwise we'll queue up a bunch of emits that could contradict each other.
      // Once we reconnect a full sync will occur anyway
      // TODO: and when we are State.connected, i.e. full "ready"
      if (docs.length && socket && socket.connected && state === State.connected) {
        debug(`stale server update for ${docs.length} docs`);

        socket.emit('docUpdate', docs);
      }

      // Always clean the docs we're aware of out though. Again, they aren't needed in the stale queue if we're offline
      dispatch(cleanStale(docs));
    };

    processStaleQueue();
  }, [dispatch, socket, stale, state]);

  useEffect(() => {
    if (socket && socket.connected && state === State.completed) {
      socket.emit('ready');
      dispatch(socketConnected());
    } else {
      // TODO: emit a not ready or disconnect to force socket communication only while not syncing
    }
  }, [dispatch, socket, state]);

  useEffect(() => {
    const initSocket = () => {
      if (socket) {
        socket.close();
      }

      debug('initializing server socket');
      const localSocket = io();

      localSocket.on('connect', async () => {
        debug('socket connected');
        dispatch(requestSync());
      });

      localSocket.on('docUpdate', async (docs: Doc[]) => {
        debug('got update from socket');

        const { writes, deletes } = splitDeletes(docs);

        // TODO: do these in parallel, see if it's faster
        if (deletes.length) {
          await deletesFromRemote(db, deletes);
        }
        if (writes.length) {
          await writesFromRemote(db, writes);
        }

        dispatch(update(docs));
      });

      localSocket.on('disconnect', () => {
        debug('socket disconnected');
        dispatch(socketDisconnected());
      });

      setSocket(localSocket);
    };

    initSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, dispatch /*socket*/]);

  return null;
}

export default SyncManager;