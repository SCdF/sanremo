import { createSlice } from '@reduxjs/toolkit';
import { RepeatableDoc } from '../../../shared/types';

export const repeatableSlice = createSlice({
  name: 'repeatable',
  initialState: {
    doc: undefined,
  } as { doc?: RepeatableDoc },
  reducers: {
    set: (state, action: { payload: RepeatableDoc }) => {
      state.doc = action.payload;
    },
    clear: (state) => {
      state.doc = undefined;
    },
    updateRev: (state, action: { payload: string }) => {
      if (state.doc) {
        state.doc._rev = action.payload;
      }
    },
    updateSlug: (state, action: { payload: string | number }) => {
      if (state.doc) {
        state.doc.slug = action.payload;
      }
    },
    toggleValue: (state, action: { payload: { idx: number; now: number } }) => {
      if (state.doc) {
        state.doc.values[action.payload.idx] = !!!state.doc.values[action.payload.idx];
        state.doc.updated = action.payload.now;
      }
    },
    complete: (state, action: { payload: { now: number } }) => {
      if (state.doc) {
        state.doc.updated = state.doc.completed = action.payload.now;
      }
    },
    uncomplete: (state, action: { payload: { now: number } }) => {
      if (state.doc) {
        delete state.doc.completed;
        state.doc.updated = action.payload.now;
      }
    },
    deleteIt: (state, action: { payload: { now: number } }) => {
      if (state.doc) {
        state.doc._deleted = true;
        state.doc.updated = action.payload.now;
      }
    },
  },
});

export const { set, clear, updateRev, updateSlug, toggleValue, complete, uncomplete, deleteIt } =
  repeatableSlice.actions;
export default repeatableSlice.reducer;
