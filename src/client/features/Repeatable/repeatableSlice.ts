import { createSlice } from '@reduxjs/toolkit';
import { RepeatableDoc } from '../../../shared/types';

export const repeatableSlice = createSlice({
  name: 'repeatable',
  initialState: {
    doc: undefined,
    dirty: false,
  } as { doc?: RepeatableDoc; dirty: boolean },
  reducers: {
    set: (state, action: { payload: RepeatableDoc }) => {
      state.doc = action.payload;
    },
    clear: (state) => {
      state.doc = undefined;
    },
    writeComplete: (state, action: { payload: string }) => {
      if (state.doc) {
        state.doc._rev = action.payload;
        state.dirty = false;
      }
    },
    updateSlug: (state, action: { payload: string | number }) => {
      if (state.doc) {
        state.doc.slug = action.payload;
        state.dirty = true;
      }
    },
    toggleValue: (state, action: { payload: { idx: number; now: number } }) => {
      if (state.doc) {
        state.doc.values[action.payload.idx] = !!!state.doc.values[action.payload.idx];
        state.doc.updated = action.payload.now;
        state.dirty = true;
      }
    },
    complete: (state, action: { payload: { now: number } }) => {
      if (state.doc) {
        state.doc.updated = state.doc.completed = action.payload.now;
        state.dirty = true;
      }
    },
    uncomplete: (state, action: { payload: { now: number } }) => {
      if (state.doc) {
        delete state.doc.completed;
        state.doc.updated = action.payload.now;
        state.dirty = true;
      }
    },
    deleteIt: (state, action: { payload: { now: number } }) => {
      if (state.doc) {
        state.doc._deleted = true;
        state.doc.updated = action.payload.now;
        state.dirty = true;
      }
    },
  },
});

export const {
  set,
  clear,
  writeComplete,
  updateSlug,
  toggleValue,
  complete,
  uncomplete,
  deleteIt,
} = repeatableSlice.actions;
export default repeatableSlice.reducer;
