import { createSlice } from '@reduxjs/toolkit';

export const updateSlice = createSlice({
  name: 'update',
  initialState: {
    waitingToInstall: false,
    userReadyToUpdate: false,
    lastChecked: Date.now() as number | unknown,
  },
  reducers: {
    userReadyToUpdate: (state) => {
      state.userReadyToUpdate = true;
    },
    // TODO: we are using redux as a primitive message passing system. This is probably wrong
    // (eg by wiping lastChecked we trigger the Update component to check for an update)

    updateReadyToInstall: (state) => {
      state.lastChecked = Date.now();
      state.waitingToInstall = true;
    },
    noUpdateReady: (state) => {
      state.lastChecked = Date.now();
    },
    checkForUpdate: (state) => {
      state.lastChecked = undefined;
    },
  },
});

export const { noUpdateReady, updateReadyToInstall, userReadyToUpdate, checkForUpdate } =
  updateSlice.actions;
export default updateSlice.reducer;
