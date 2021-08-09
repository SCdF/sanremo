import { createSlice } from '@reduxjs/toolkit';
import { Doc } from '../../server/types';

export const docsSlice = createSlice({
  name: 'docs',
  initialState: {
    repeatable: undefined as unknown as Doc,
    template: undefined as unknown as Doc,
    /**
     * Trigger to refresh lists. In the future we could more intelligently detect
     * if a list has to be refreshed, but that involves the list-filtering logic
     * either being only here or being here and the list's origin
     */
    lastSynced: undefined as unknown as number,
  },
  reducers: {
    setRepeatable: (state, action) => {
      state.repeatable = action.payload;
    },
    setTemplate: (state, action) => {
      state.template = action.payload;
    },
    // TODO: add types into action, so we don't forget we need to send in array
    update: (state, action) => {
      const updatedDocs: Doc[] = action.payload;
      for (const doc of updatedDocs) {
        if (state.repeatable?._id === doc._id) {
          state.repeatable = doc;
        }
        // It's not clear how this could happen, considering we version these in the _id
        // Putting it here anyway
        if (state.template?._id === doc._id) {
          state.template = doc;
        }
      }
      state.lastSynced = Date.now();
    },
  },
});

export const { setRepeatable, setTemplate, update } = docsSlice.actions;
export default docsSlice.reducer;
