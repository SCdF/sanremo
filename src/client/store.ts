import { configureStore } from '@reduxjs/toolkit';
import userReducer from './state/userSlice';
import docsSlice from './state/docsSlice';

function createStore() {
  return configureStore({
    reducer: { user: userReducer, docs: docsSlice },
    // devTools: process.env.NODE_ENV !== 'production',
  });
}
const store = createStore();

export default store;

export { createStore };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
