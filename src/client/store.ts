import * as RR from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import userReducer from './state/userSlice';
import docsSlice from './state/docsSlice';
import pageSlice from './state/pageSlice';
import syncSlice from './state/syncSlice';
import debugSlice from './state/debugSlice';
import updateSlice from './state/updateSlice';

function createStore() {
  return configureStore({
    reducer: {
      user: userReducer,
      docs: docsSlice,
      page: pageSlice,
      sync: syncSlice,
      debug: debugSlice,
      update: updateSlice,
    },
    // devTools: process.env.NODE_ENV !== 'production',
  });
}
const store = createStore();

export default store;

export { createStore };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useSelector: RR.TypedUseSelectorHook<RootState> = RR.useSelector;
export const useDispatch = () => RR.useDispatch<AppDispatch>();
