import { configureStore } from '@reduxjs/toolkit';
import userReducer from './state/userSlice';
import docsSlice from './state/docsSlice';
import pageSlice from './state/pageSlice';

function createStore() {
  return configureStore({
    reducer: { user: userReducer, docs: docsSlice, page: pageSlice },
    // devTools: process.env.NODE_ENV !== 'production',
  });
}
const store = createStore();

export default store;

export { createStore };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
