import { createSlice } from '@reduxjs/toolkit';
import { Doc } from '../../server/types';

export const docsSlice = createSlice({
  name: 'docs',
  initialState: { repeatable: undefined as unknown as Doc, template: undefined as unknown as Doc },
  reducers: {
    setRepeatable: (state, action) => {
      state.repeatable = action.payload;
    },
    update: (state, action) => {
      // TODO: add types into action, so we don't forget we need to send in array
      const updatedDocs: Doc[] = action.payload;
      for (const doc of updatedDocs) {
        if (state.repeatable?._id === doc._id) {
          state.repeatable = doc;
        }
      }
    },
  },
});

export const { setRepeatable, update } = docsSlice.actions;
export default docsSlice.reducer;
