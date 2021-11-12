import { eventChannel, SagaIterator } from 'redux-saga';
import { take, call, put, fork, cancel, apply, takeEvery } from 'redux-saga/effects';
import { io, Socket as ioSocket } from 'socket.io-client';
import { ClientToServerEvents, Doc, ServerToClientEvents } from '../../../shared/types';
import {
  completeSync,
  externalWrite,
  internalWrite,
  requestSync,
  socketConnected,
  socketDisconnected,
} from '../../features/Sync/syncSlice';
import { debugClient } from '../../globals';

const debug = debugClient('saga:storage:socket');

type Socket = ioSocket<ServerToClientEvents, ClientToServerEvents>;

function connectChan(socket: Socket) {
  return eventChannel((emitter) => {
    const handler = () => emitter('connect');
    socket.on('connect', handler);
    return () => socket.off('connect', handler);
  });
}
function disconnectChan(socket: Socket) {
  return eventChannel((emitter) => {
    const handler = () => emitter('disconnect');
    socket.on('disconnect', handler);
    return () => socket.off('disconnect', handler);
  });
}
function docUpdateChan(socket: Socket) {
  return eventChannel((emitter) => {
    const handler = (docs: Doc[]) => {
      debug(`got docUpdate for ${docs.length}`);
      emitter({ docs });
    };
    socket.on('docUpdate', handler);
    return () => socket.off('docUpdate', handler);
  });
}

function* listenForServerUpdates(socket: Socket): SagaIterator {
  debug('listening for server updates');
  const updateFromSocket = yield call(docUpdateChan, socket);
  yield takeEvery(updateFromSocket, function* ({ docs }: { docs: Doc[] }) {
    debug(`pulling server update for ${docs.map((d) => d._id).join(', ')}`);

    yield put(externalWrite(docs)); // local.ts will be listening for this
  });
}

function* listenForClientUpdates(socket: Socket): SagaIterator {
  debug('listening for client updates');
  yield takeEvery(internalWrite, function ({ payload }: { payload: Doc[] }) {
    debug(`pushing client update for ${payload.map((d) => d._id).join(', ')}`);
    socket.emit('docUpdate', payload);
  });
}

function* connectedSocket(socket: Socket): SagaIterator {
  // Connect and once connected do a full sync
  const chan = yield call(connectChan, socket);
  yield take(chan);
  debug('socket connected, pausing for sync');
  yield put(requestSync());

  // Wait for the full sync to complete
  yield take(completeSync);
  debug('sync completed, ready');
  // FIXME: this code works but the types aren't happy, even though it's the same as an internet example
  // https://redux-saga.js.org/docs/advanced/Channels/#using-the-eventchannel-factory-to-connect-to-external-events
  // @ts-ignore
  yield apply(socket, socket.emit, ['ready']);
  yield put(socketConnected());

  // Listen bi-directionally for changes
  yield fork(listenForServerUpdates, socket);
  yield fork(listenForClientUpdates, socket);
}

/**
 * Manages bidirectional socket logic.
 *
 * Responsible for socket logic, including firing off a full sync when (re)connecting
 *
 * Pouch writes that are trigged here are handled in local.ts
 */
function* manageSocket(): SagaIterator {
  debug('Initializing');

  let socket: Socket | undefined = undefined;
  try {
    socket = io();

    while (true) {
      // Connect the socket, wait and work it
      const connectedSocketTask = yield fork(connectedSocket, socket);

      // Wait for a disconnect
      const chan = yield call(disconnectChan, socket);
      yield take(chan);
      debug('socket disconnected');
      // Cancel the current work so we can wait for a reconnection again
      yield cancel(connectedSocketTask);
      yield put(socketDisconnected());
    }
  } finally {
    debug('manageSocket closing');
    if (socket) yield apply(socket, socket.close, []);
  }
}

export default manageSocket;
