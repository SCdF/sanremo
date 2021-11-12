import axios from 'axios';
import { SagaIterator } from 'redux-saga';
import { call, put, take } from 'redux-saga/effects';
import { Requests } from '../../../server/sync/types';
import { Doc, DocStub } from '../../../shared/types';
import { Database } from '../../db';
import {
  completeSync,
  externalWrite,
  requestSync,
  resetProgress,
  socketDisconnected,
  startSync,
  syncError,
  updateProgress,
} from '../../features/Sync/syncSlice';
import { setUserAsUnauthenticated } from '../../features/User/userSlice';
import { debugClient } from '../../globals';
import { splitDeletes } from './utils';

const debug = debugClient('saga:storage:sync');

const BATCH_SIZE = 20;

async function getLocalStubs(handle: Database) {
  // The only way to see deleted documents with PouchDB is with the changes feed to get all ids
  const changes = await handle.changes({ filter: (d: Doc) => !d._id.startsWith('_design/') });
  const stubs: DocStub[] = changes.results.map((row) => {
    return {
      _id: row.id,
      // FIXME: work out if I ever need to care about more than one change
      _rev: row.changes[0].rev,
      _deleted: row.deleted,
    };
  });
  return stubs;
}

async function getServerState(stubs: Doc[]) {
  return await axios
    .post('/api/sync/begin', {
      docs: stubs,
    })
    .then(({ data }) => data);
}

function* giveServerWhatItNeeds(handle: Database, stubs: DocStub[]): SagaIterator {
  const getLocalDocs = async (batch: Doc[]) =>
    handle.allDocs({
      include_docs: true,
      keys: batch.map((d) => d._id),
    });

  const updateServerDocs = async (batch: Doc[]) =>
    axios.post('/api/sync/update', {
      docs: batch,
    });

  // Give the server what they need
  while (stubs.length > 0) {
    const batch = stubs.splice(0, BATCH_SIZE);
    debug(`-> preparing ${batch.length}`);

    const result: PouchDB.Core.AllDocsResponse<{}> = yield call(getLocalDocs, batch);
    debug('-> got local');

    const docs = result.rows.map(
      (r) => r.doc || { _id: r.id, _rev: r.value.rev, _deleted: r.value.deleted }
    );

    yield call(updateServerDocs, docs);
    debug('-> sent');

    yield put(updateProgress(batch.length));
  }
}

function* getWhatClientNeeds(handle: Database, stubs: DocStub[]): SagaIterator {
  const getServerDocs = async (docs: Doc[]) =>
    axios
      .post('/api/sync/request', {
        docs,
      })
      .then(({ data }) => data);

  // Get what we need from the server
  while (stubs.length > 0) {
    const batch = stubs.splice(0, BATCH_SIZE);
    debug(`<- preparing ${batch.length}`);

    const { deletes, writes }: { deletes: Doc[]; writes: Doc[] } = yield call(splitDeletes, batch);

    let updates = deletes; // we don't need to request deletes, the stub is enough
    if (writes.length) {
      const result: Doc[] = yield call(getServerDocs, batch);
      updates = updates.concat(result);
      debug('<- got server');
    }

    yield put(externalWrite(updates));
    debug('<- state updated');

    yield put(updateProgress(batch.length));
  }
}

/**
 * Listens for and coordinates a full synchronization with the server
 *
 * Any subsequent local writes are handled by local.ts
 */
function* manageFullSync(handle: Database): SagaIterator {
  debug('Initializing');
  while (yield take(requestSync)) {
    try {
      debug('full sync requested');
      yield put(startSync());

      const stubs: DocStub[] = yield call(getLocalStubs, handle);
      debug(`locally we have ${stubs.length} docs`);

      debug('checking with the server');
      const serverState: Requests = yield call(getServerState, stubs);
      debug(`the server needs ${serverState.server.length}, we need ${serverState.client.length}`);

      const docTotal = serverState.client.length + serverState.server.length;
      if (docTotal > 0) {
        debug('starting transfers');
        yield put(resetProgress(docTotal));

        // PERF: the two while blocks could extracted into sagas and done in parallel
        // This needs a refactor of updateProgress to just store progress counts and do % math on display
        // (so each one can update the count independently just by saying "n more docs have been processed")
        // yield all([
        yield call(giveServerWhatItNeeds, handle, serverState.server);
        yield call(getWhatClientNeeds, handle, serverState.client);
        // ]);
      }

      yield put(completeSync());
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        debug('sync failed as user is no longer authenticated');
        yield put(setUserAsUnauthenticated());
        yield put(socketDisconnected());
      } else {
        console.error('Failed to sync', e);
        yield put(syncError(e));
      }
    }
  }
}

export default manageFullSync;
