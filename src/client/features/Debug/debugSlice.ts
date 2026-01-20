import type { Middleware } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import debugModule from 'debug';

const DEBUG_KEY = 'debug-filter';

// Initialize from localStorage at module load time
function getInitialDebugValue(): string | null {
  const stored = localStorage.getItem(DEBUG_KEY);
  if (stored) {
    debugModule.enable(stored);
  } else {
    debugModule.disable();
  }
  return stored;
}

export const debugSlice = createSlice({
  name: 'debug',
  initialState: { value: getInitialDebugValue() },
  reducers: {
    set: (state, action) => {
      state.value = action.payload;
    },
  },
});

// Middleware to sync debug state changes to localStorage and debugModule
export const debugMiddleware: Middleware = () => (next) => (action) => {
  const result = next(action);

  if (debugSlice.actions.set.match(action)) {
    const newValue = action.payload;
    if (newValue === null) {
      debugModule.disable();
      localStorage.removeItem(DEBUG_KEY);
    } else if (newValue) {
      debugModule.enable(newValue);
      localStorage.setItem(DEBUG_KEY, newValue);
    }
  }

  return result;
};

export const { set } = debugSlice.actions;
export default debugSlice.reducer;
