import { SagaIterator } from 'redux-saga';
import { take, select, race, fork, cancel } from 'redux-saga/effects';

import db, { Database } from '../../db';
import { debugClient } from '../../globals';
import { setUserAsGuest, setUserAsLoggedIn } from '../../features/User/userSlice';

import local from './local';
import manageSocket from './socket';
import manageFullSync from './sync';

const debug = debugClient('saga:storage');

function* ManageUserData(handle: Database, loggedIn: boolean): SagaIterator {
  debug(`Initializing Storage Saga ${loggedIn ? 'with network' : 'just local'}`);

  yield fork(local, handle);
  if (loggedIn) {
    yield fork(manageFullSync, handle);
    yield fork(manageSocket);
  }
}

function* StorageSaga(): SagaIterator {
  debug('Initializing Storage Saga listener');
  let handle;

  while (true) {
    const userChangedAction = yield race({
      guest: take(setUserAsGuest),
      user: take(setUserAsLoggedIn),
    });
    const isLoggedIn = !!userChangedAction.user;

    const user = yield select((state) => state.user.value);
    const dbHandle = db(user);

    if (handle) yield cancel(handle);
    handle = yield fork(ManageUserData, dbHandle, isLoggedIn);
  }
}

export default StorageSaga;
