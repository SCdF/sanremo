import { createSlice } from '@reduxjs/toolkit';

export const updateSlice = createSlice({
  name: 'update',
  initialState: { needed: false, requested: false },
  reducers: {
    updateNeeded: (state) => {
      state.needed = true;
    },
    requestUpdate: (state) => {
      state.requested = true;
    },
  },
});

export const { updateNeeded, requestUpdate } = updateSlice.actions;
export default updateSlice.reducer;
