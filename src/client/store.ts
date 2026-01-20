import { configureStore } from '@reduxjs/toolkit';
import * as RR from 'react-redux';

import debugSlice, { debugMiddleware } from './features/Debug/debugSlice';
import pageSlice from './features/Page/pageSlice';
import syncSlice from './features/Sync/syncSlice';
import updateSlice from './features/Update/updateSlice';
import userReducer from './features/User/userSlice';
import docsSlice from './state/docsSlice';

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
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(debugMiddleware),
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
