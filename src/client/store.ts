import { configureStore } from '@reduxjs/toolkit';
import userReducer from './state/userSlice';

function createStore() {
  return configureStore({
    reducer: { user: userReducer },
  });
}
const store = createStore();

export default store;

export { createStore };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
