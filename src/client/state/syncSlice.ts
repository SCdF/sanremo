import { createSlice } from '@reduxjs/toolkit';
import { Doc, DocId } from '../../shared/types';

type DocMap = Record<DocId, Doc>;

export const syncSlice = createSlice({
  name: 'sync',
  initialState: {
    stale: {} as DocMap,
  },
  reducers: {
    // TODO: work out how to only use this while online
    // there is no point keeping a stale queue while we're offline, as we do a full sync when we come online
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
    cleanStaleAll: (state) => {
      state.stale = {};
    },
  },
});

export const { markStale, cleanStale, cleanStaleAll } = syncSlice.actions;
export default syncSlice.reducer;
