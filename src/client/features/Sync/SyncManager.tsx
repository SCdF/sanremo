// TODO: drop axios and just use fetch
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import type { Requests } from '../../../server/sync/types';
import type {
  ClientToServerEvents,
  Doc,
  DocStub,
  ServerToClientEvents,
} from '../../../shared/types';
import db, { type Database } from '../../db';
import { debugClient } from '../../globals';
import { update } from '../../state/docsSlice';
import { useDispatch, useSelector } from '../../store';
import { checkForUpdate } from '../Update/updateSlice';
import { selectIsGuest, setUserAsUnauthenticated } from '../User/userSlice';
import { registerSocket } from './socketRegistry';
import {
  completeSync,
  requestSync,
  State,
  socketConnected,
  socketDisconnected,
  startSync,
  syncError,
  updateProgress,
} from './syncSlice';

const debug = debugClient('sync');

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
    { deletes: [] as Doc[], writes: [] as Doc[] },
  );
}

async function writesFromRemote(handle: Database, writes: Doc[]) {
  // To avoid conflicts, AND to write the exact rev we're given, we need both write with
  // `new_edits: false` so we get to specify any _rev we want, AND delete any "conflicts".
  // Unfortunately, `new_edits: false` always creates conflicts, so we preemptively delete
  // the docs and then re-write them with their correct data and remote _rev
  await deletesFromRemote(handle, writes);

  await handle.bulkDocs(writes, {
    new_edits: false,
  });
}

async function deletesFromRemote(handle: Database, deletes: Doc[]) {
  const deleteResults = await handle.allDocs({ keys: deletes.map((d) => d._id) });
  const deletedDocs = deleteResults.rows.map((row) => ({
    _id: row.key,
    // If the client doesn't have this document, the row will have
    //error: "not_found"
    // and no _rev. No _rev is okay, pouch will create one
    // @ts-expect-error FIXME the types changed, work out what to do with erroring rows
    _rev: row?.value?.rev,
    _deleted: true,
  }));

  await handle.bulkDocs(deletedDocs);
}

function SyncManager() {
  const dispatch = useDispatch();

  const user = useSelector((state) => state.user.value);
  const isGuest = useSelector(selectIsGuest);
  const handle = db(user);

  const state = useSelector((state) => state.sync.state);

  const [socket, setSocket] = useState(
    undefined as unknown as Socket<ServerToClientEvents, ClientToServerEvents>,
  );

  // Ref to access current socket from sync handlers without adding socket to dependencies
  const socketRef = useRef(socket);
  socketRef.current = socket;

  useEffect(() => {
    // PERF: make this work more in parallel, benchmark it to see if it makes a difference etc
    const handleFullSync = async () => {
      try {
        // Get the docs we have locally. The only way to see deleted documents with PouchDB
        // is with the changes feed to get all ids
        const changes = await handle.changes({ filter: (d: Doc) => !d._id.startsWith('_design/') });
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
          `the server needs ${serverState.server.length}, we need ${serverState.client.length}`,
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

            const result = await handle.allDocs({
              include_docs: true,
              keys: batch.map((d) => d._id),
            });
            debug('-> got local');

            await axios.post('/api/sync/update', {
              docs: result.rows.map(
                // @ts-expect-error FIXME the types changed, work out what to do with erroring rows
                (r) => r.doc || { _id: r.id, _rev: r.value.rev, _deleted: r.value.deleted },
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
              await deletesFromRemote(handle, deletes);
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

              await writesFromRemote(handle, result);
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

        // Signal ready and transition to connected state directly after sync completes
        // Using socketRef to access current socket without adding it to useEffect dependencies
        const currentSocket = socketRef.current;
        if (currentSocket?.connected) {
          debug('sync complete, emitting ready signal');
          currentSocket.emit('ready');
          dispatch(socketConnected());
        }
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 401) {
          debug('sync failed as user is no longer authenticated');
          dispatch(setUserAsUnauthenticated());
          dispatch(socketDisconnected());
        } else {
          console.error('Failed to sync', e);
          dispatch(syncError(e));
        }
      } finally {
        debug('finished');
      }
    };

    if (state === State.requested) {
      debug('starting full sync');
      dispatch(startSync());
      handleFullSync();
    }
  }, [handle, dispatch, state]);

  // we are using the trigger of this to
  // close the socket, so we can't also pass in the socket because when it's created it would be
  // deleted again straight away
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    const initSocket = () => {
      if (socket) {
        socket.close();
        registerSocket(null);
      }

      if (isGuest) {
        return;
      }

      debug('initializing server socket');
      const localSocket = io();

      localSocket.on('connect', async () => {
        debug('socket connected');
        dispatch(requestSync());
        dispatch(checkForUpdate());
      });

      localSocket.on('docUpdate', async (docs: Doc[]) => {
        debug('got update from socket');

        const { writes, deletes } = splitDeletes(docs);

        // PERF: do these in parallel, see if it's faster
        if (deletes.length) {
          await deletesFromRemote(handle, deletes);
        }
        if (writes.length) {
          await writesFromRemote(handle, writes);
        }

        dispatch(update(docs));
      });

      localSocket.on('disconnect', () => {
        debug('socket disconnected');
        dispatch(socketDisconnected());
      });

      setSocket(localSocket);
      registerSocket(localSocket);
    };

    initSocket();
  }, [isGuest, handle, dispatch]);

  return null;
}

export default SyncManager;
