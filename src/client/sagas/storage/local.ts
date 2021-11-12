import { getType } from '@reduxjs/toolkit';
import { buffers, eventChannel, SagaIterator } from 'redux-saga';
import { actionChannel, take, call, put, select, fork } from 'redux-saga/effects';
import { Doc, RepeatableDoc, TemplateDoc } from '../../../shared/types';
import { Database } from '../../db';
import {
  toggleValue,
  complete,
  uncomplete,
  deleteIt,
  updateRev,
  updateSlug,
} from '../../features/Repeatable/repeatableSlice';
import { dataChanged, externalWrite, internalWrite } from '../../features/Sync/syncSlice';
import { set as setTemplate } from '../../features/Template/templateSlice';
import { set as setRepeatable } from '../../features/Repeatable/repeatableSlice';
import { debugClient } from '../../globals';
import { splitDeletes, deletesFromRemote, writesFromRemote } from './utils';

const debug = debugClient('saga:storage:local');

function dataChangeChan(handle: Database) {
  return eventChannel((emitter) => {
    const change = handle.changes({ live: true, since: 'now' }).on('change', emitter);
    return change.cancel;
  });
}

function* dataChangeWatcher(handle: Database): SagaIterator {
  const chan = yield call(dataChangeChan, handle);
  while (yield take(chan)) {
    yield put(dataChanged());
  }
}

// Actions that the user performs.
// These need to be stored to pouch, and propagated To the server if the socket is functioning
// (this is not all actions against repeatableSlice, just the user initiated ones)
const RepeatableWritesByUser = [toggleValue, updateSlug, complete, uncomplete, deleteIt].map(
  getType
);

async function writeToLocal(handle: Database, doc: Doc) {
  debug(`writeToLocal ${doc._id}`);
  const { rev } = await handle.put(doc);
  return rev;
}

/**
 * Catches changes the local user performs and writes them to PouchDB
 */
function* localUserWrites(handle: Database): SagaIterator {
  // The sliding buffer means we'll write at least the first and last changes in a quick succession,
  // writing the entire document both times
  const userModifiedRepeatable = yield actionChannel(RepeatableWritesByUser, buffers.sliding(1));
  // DONOTMERGE: also do template changes

  while (yield take(userModifiedRepeatable)) {
    debug('Got user write');

    const repeatable = yield select((state) => state.repeatable.doc);

    const rev = yield call(writeToLocal, handle, repeatable);
    yield put(updateRev(rev));
    yield put(internalWrite([repeatable])); // triggers the manageSocket saga to write to the socket
  }
}

/**
 * Catches changes brought in by another user (ie the same "user", but on a different instance
 * via sync or socket))
 */
function* foreignUserWrites(handle: Database): SagaIterator {
  const bufferedWrites = yield actionChannel(externalWrite);
  while (true) {
    const { payload } = yield take(bufferedWrites);
    debug(`got ${payload.length} foreign user writes`);

    const { writes, deletes } = splitDeletes(payload);
    yield fork(deletesFromRemote, handle, deletes);
    yield fork(writesFromRemote, handle, writes);

    const { rId, tId } = yield select((state) => ({
      rId: state.repeatable.doc?._id,
      tId: state.template.doc?._id,
    }));

    for (const doc of payload) {
      if (doc._id === tId) {
        yield put(setTemplate(doc as TemplateDoc));
      } else if (doc._id === rId) {
        yield put(setRepeatable(doc as RepeatableDoc));
      }
    }
  }
}

function* local(handle: Database): SagaIterator {
  debug('Initializing');
  yield fork(dataChangeWatcher, handle);
  yield fork(localUserWrites, handle);
  yield fork(foreignUserWrites, handle);
}

export default local;
