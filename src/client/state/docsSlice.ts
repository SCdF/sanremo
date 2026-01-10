import { createSlice } from '@reduxjs/toolkit';
import type { Doc, RepeatableDoc, TemplateDoc } from '../../shared/types';

type State = {
  repeatable?: RepeatableDoc;
  template?: TemplateDoc;
  lastSynced?: number;
};
export const docsSlice = createSlice({
  name: 'docs',
  initialState: {
    repeatable: undefined,
    template: undefined,
    /**
     * Trigger to refresh lists. In the future we could more intelligently detect
     * if a list has to be refreshed, but that involves the list-filtering logic
     * either being only here or being here and the list's origin
     */
    lastSynced: undefined,
  } as State,
  reducers: {
    setRepeatable: (state, action: { payload: RepeatableDoc }) => {
      state.repeatable = action.payload;
    },
    setTemplate: (state, action: { payload: TemplateDoc }) => {
      state.template = action.payload;
    },
    clearRepeatable: (state) => {
      state.repeatable = undefined;
    },
    clearTemplate: (state) => {
      state.template = undefined;
    },
    update: (state, action: { payload: Doc[] }) => {
      const updatedDocs: Doc[] = action.payload;
      for (const doc of updatedDocs) {
        if (state.repeatable?._id === doc._id) {
          state.repeatable = doc as RepeatableDoc;
        }
        // It's not clear how this could happen, considering we version these in the _id
        // Putting it here anyway
        if (state.template?._id === doc._id) {
          state.template = doc as TemplateDoc;
        }
      }
      state.lastSynced = Date.now();
    },
  },
});

export const { setRepeatable, setTemplate, clearRepeatable, clearTemplate, update } =
  docsSlice.actions;
export default docsSlice.reducer;
