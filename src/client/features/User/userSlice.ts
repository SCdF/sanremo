import { createSelector, createSlice } from '@reduxjs/toolkit';
import { User } from '../../../shared/types';
import { RootState } from '../../store';

export type Guest = User & {
  guest: true;
};

// only exposed for testing matching
export const GuestUser: Guest = {
  id: -1,
  name: 'guest',
  guest: true,
};

export const userSlice = createSlice({
  name: 'user',
  initialState: { value: undefined as unknown as User | Guest, needsServerAuthentication: false },
  reducers: {
    setUserAsLoggedIn: (
      state,
      action: { payload: { user: User; needsServerAuthentication?: boolean } },
    ) => {
      state.value = action.payload.user;
      state.needsServerAuthentication = !!action.payload.needsServerAuthentication;
    },
    setUserAsUnauthenticated: (state) => {
      state.needsServerAuthentication = true;
    },
    setUserAsGuest: (state) => {
      state.value = GuestUser;
    },
  },
});

export const { setUserAsLoggedIn, setUserAsGuest, setUserAsUnauthenticated } = userSlice.actions;
// TODO: I don't like that the slice references the store that references the slice.
//       Can we somehow hook this up to just the userSlice?
export const selectIsGuest = createSelector(
  (state: RootState) => state.user.value,
  (user) => user && 'guest' in user && user.guest,
);
export default userSlice.reducer;
