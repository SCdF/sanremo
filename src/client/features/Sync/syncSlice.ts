import { createSlice } from '@reduxjs/toolkit';
import { Doc } from '../../../shared/types';

type SerializableError = { name: string; message: string };
// giving them strings makes redux easier to debug
export enum State {
  /** full sync requested (either manually by the user or by the socket conneecting) */
  requested = 'requested',
  /** initial, or socket is disconnected */
  disconnected = 'disconnected',
  /** a full sync is in progress, the socket is still disconnected */
  syncing = 'syncing',
  /** full sync completed successfully */
  completed = 'completed',
  /** the socket is connected, ready and waiting */
  connected = 'connected',
  /** something went 'orribly wrong */
  error = 'error',
}
type SyncState = {
  state: State;
  progress?: {
    count: number;
    total: number;
  };
  error?: SerializableError;
  // Just a cheap way to trigger list updating without having to actually know if the list is affected
  writeCount: number;
};

export const syncSlice = createSlice({
  name: 'sync',
  initialState: {
    state: State.disconnected,
    writeCount: 0,
  } as SyncState,
  reducers: {
    requestSync: (state) => {
      state.state = State.requested;
    },
    startSync: (state) => {
      state.state = State.syncing;
      delete state.progress;
      delete state.error;
    },
    resetProgress: (state, action: { payload: number }) => {
      state.progress = {
        count: 0,
        total: action.payload,
      };
    },
    updateProgress: (state, action: { payload: number }) => {
      state.progress!.count += action.payload;
    },
    completeSync: (state) => {
      state.state = State.completed;
      delete state.progress;
    },
    syncError: (state, action: { payload: any }) => {
      const error = { name: action.payload.name, message: action.payload.message };
      if (error.message === 'Network Error') {
        state.state = State.disconnected;
      } else {
        state.error = error;
        state.state = State.error;
      }
    },
    socketConnected: (state) => {
      state.state = State.connected;
    },
    socketDisconnected: (state) => {
      state.state = State.disconnected;
    },
    dataChanged: (state) => {
      state.writeCount += 1;
    },
    // TODO: should I be defining these actions elsewhere?
    internalWrite: (state, action: { payload: Doc[] }) => {
      // We don't use the docs here, but sagas (ie socket.ts) can grab them
    },
    externalWrite: (state, action: { payload: Doc[] }) => {
      // We don't use the docs here, but sagas (ie local.ts) can grab them
    },
  },
});

export const {
  requestSync,
  startSync,
  resetProgress,
  updateProgress,
  completeSync,
  syncError,
  socketConnected,
  socketDisconnected,
  dataChanged,
  internalWrite,
  externalWrite,
} = syncSlice.actions;
export default syncSlice.reducer;
