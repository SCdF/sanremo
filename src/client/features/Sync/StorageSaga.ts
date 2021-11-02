import { getType } from '@reduxjs/toolkit';
import { buffers, SagaIterator } from 'redux-saga';
import { actionChannel, take, call, put, select } from 'redux-saga/effects';
import { Doc, User } from '../../../shared/types';
import db from '../../db';
import {
  toggleValue,
  complete,
  uncomplete,
  deleteIt,
  updateRev,
  updateSlug,
} from '../Repeatable/repeatableSlice';

// Actions that the user performs.
// These need to be stored to pouch, and propagated To the server if the socket is functioning
// (this is not all actions against repeatableSlice, some actions only we perform)
const UserWrites = [toggleValue, updateSlug, complete, uncomplete, deleteIt].map(getType);

async function write(user: User, doc: Doc) {
  // FIXME: this angers unit tests. Work out how to mock out / not run Sagas in unit tests
  const handle = db(user);
  const { rev } = await handle.put(doc);
  return rev;
}

function* storage(): SagaIterator {
  const requestChan = yield actionChannel(UserWrites, buffers.sliding(1));

  while (true) {
    yield take(requestChan);

    const { user, repeatable } = yield select((state) => ({
      user: state.user.value,
      repeatable: state.repeatable.doc,
    }));

    const rev = yield call(write, user, repeatable);

    yield put(updateRev(rev));
    // TODO: push to socket
  }
}
export default storage;
