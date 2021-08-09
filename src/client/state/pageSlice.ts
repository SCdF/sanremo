import { createSlice } from '@reduxjs/toolkit';

export interface PageContext {
  /** identifier for the sidebar heading this page appears under */
  under?: string;
  /** whether you can go "back" in the browser sense, defaults to false */
  back?: boolean;
  /** the title you want the window to have */
  title?: string;
}

// FIXME: changing these on navigate / context change should not be optional
// I don't like that the child of Page can forget to set state like title etc
// For the most part, these are declaratively inherent to the data being
// displayed, and we shouldn't have to set them programmatically
export const pageSlice = createSlice({
  name: 'page',
  initialState: {
    value: {} as PageContext,
  },
  reducers: {
    set: (state, action: { payload: PageContext; type: string }) => {
      state.value = action.payload;
    },
  },
});

export const { set } = pageSlice.actions;
export default pageSlice.reducer;
