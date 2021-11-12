import * as RR from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';

import StorageSaga from './sagas/storage';

import userReducer from './features/User/userSlice';
import templateSlice from './features/Template/templateSlice';
import pageSlice from './features/Page/pageSlice';
import syncSlice from './features/Sync/syncSlice';
import debugSlice from './features/Debug/debugSlice';
import updateSlice from './features/Update/updateSlice';
import repeatableSlice from './features/Repeatable/repeatableSlice';

function createStore(sagas = false) {
  const sagaMiddleware = createSagaMiddleware();

  const middlewares = [sagaMiddleware];

  const store = configureStore({
    reducer: {
      user: userReducer,
      page: pageSlice,
      sync: syncSlice,
      debug: debugSlice,
      update: updateSlice,
      template: templateSlice,
      repeatable: repeatableSlice,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: false }).concat(middlewares),
    // devTools: process.env.NODE_ENV !== 'production',
  });

  if (sagas) {
    sagaMiddleware.run(StorageSaga);
  }

  return store;
}
const store = createStore(true);

export default store;

export { createStore };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useSelector: RR.TypedUseSelectorHook<RootState> = RR.useSelector;
export const useDispatch = () => RR.useDispatch<AppDispatch>();
