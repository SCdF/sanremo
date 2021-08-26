import { createSlice } from '@reduxjs/toolkit';
import { User } from '../../../shared/types';

export const userSlice = createSlice({
  name: 'user',
  initialState: { value: undefined as unknown as User },
  reducers: {
    set: (state, action) => {
      state.value = action.payload;
    },
  },
});

export const { set } = userSlice.actions;
export default userSlice.reducer;
