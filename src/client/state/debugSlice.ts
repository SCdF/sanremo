import { createSlice } from '@reduxjs/toolkit';

export const debugSlice = createSlice({
  name: 'debug',
  initialState: { value: undefined as unknown as string },
  reducers: {
    set: (state, action) => {
      state.value = action.payload;
    },
  },
});

export const { set } = debugSlice.actions;
export default debugSlice.reducer;
