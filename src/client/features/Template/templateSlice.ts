import { createSlice } from '@reduxjs/toolkit';
import { TemplateDoc } from '../../../shared/types';

export const templateSlice = createSlice({
  name: 'template',
  initialState: {
    doc: undefined,
  } as { doc?: TemplateDoc },
  reducers: {
    set: (state, action: { payload: TemplateDoc }) => {
      state.doc = action.payload;
    },
    clear: (state) => {
      state.doc = undefined;
    },
  },
});

export const { set, clear } = templateSlice.actions;
export default templateSlice.reducer;
