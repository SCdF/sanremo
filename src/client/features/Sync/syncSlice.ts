import { createSlice } from '@reduxjs/toolkit';
import { Doc, DocId } from '../../../shared/types';

type DocMap = Record<DocId, Doc>;
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
  stale: DocMap;
  state: State;
  progress?: number;
  error?: SerializableError;
};

export const syncSlice = createSlice({
  name: 'sync',
  initialState: {
    stale: {} as DocMap,
    state: State.disconnected,
  } as SyncState,
  reducers: {
    // TODO: refactor only mark stale when connected
    markStale: (state, action: { payload: Doc }) => {
      state.stale[action.payload._id] = action.payload;
    },
    cleanStale: (state, action: { payload: Doc[] }) => {
      action.payload.forEach((doc: Doc) => {
        const dirty = state.stale[doc._id];
        if (dirty?._rev === doc._rev) {
          delete state.stale[doc._id];
        }
      });
    },
    requestSync: (state) => {
      state.state = State.requested;
    },
    startSync: (state) => {
      state.state = State.syncing;
      delete state.progress;
      delete state.error;
      state.stale = {};
    },
    // TODO: should we store the count and total, do this math on display?
    updateProgress: (state, action: { payload: { count: number; total: number } }) => {
      state.progress = Math.floor((action.payload.count / action.payload.total) * 100);
    },
    completeSync: (state) => {
      state.state = State.completed;
      delete state.progress;
    },
    syncError: (state, action: { payload: Error }) => {
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
  },
});

export const {
  markStale,
  cleanStale,
  requestSync,
  startSync,
  updateProgress,
  completeSync,
  syncError,
  socketConnected,
  socketDisconnected,
} = syncSlice.actions;
export default syncSlice.reducer;
