import { createSlice } from '@reduxjs/toolkit';
import { useLayoutEffect } from 'react';
import { useDispatch } from '../../store';

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

/**
 * Sets the page context (title, back button, sidebar highlight).
 *
 * This hook centralizes the page context setting pattern, replacing individual
 * useEffect calls in each page component. It uses useLayoutEffect to ensure
 * the context is set synchronously before paint, avoiding visual flicker.
 *
 * The hook re-runs when any context value changes.
 */
export function usePageContext(context: PageContext): void {
  const dispatch = useDispatch();
  const { title, back, under } = context;

  useLayoutEffect(() => {
    dispatch(set({ title, back, under }));
  }, [dispatch, title, back, under]);
}
