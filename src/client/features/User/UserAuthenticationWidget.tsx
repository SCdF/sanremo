import { Button, Container, FormHelperText, TextField } from '@mui/material';
import { FormEvent, useState } from 'react';
import { useDispatch } from 'react-redux';

import axios from 'axios';
import { User } from '../../../shared/types';
import { migrateFromGuest } from '../../db';
import { setUserAsLoggedIn } from './userSlice';

export enum Action {
  Create = 0,
  Authenticate = 1,
}
function UserAuthenticationWidget(props: { username?: string; action: Action }) {
  const dispatch = useDispatch();

  const [username, setUsername] = useState(props.username);
  const [password, setPassword] = useState(undefined as unknown as string);

  const [error, setError] = useState(undefined as unknown as string);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!username) {
      return setError('No username!');
    }

    if (!password) {
      return setError('No password!');
    }

    try {
      const response = await (props.action === Action.Create ? axios.put : axios.post)(
        '/api/auth',
        {
          username,
          password,
        },
      );
      const user: User = response.data;

      if (props.action === Action.Create) {
        await migrateFromGuest(user);
      }
      // TODO: consider what to do with guest data when logging in.
      // is it weird that if you've touched local data and then log in, the local data stays but hidden?

      dispatch(setUserAsLoggedIn({ user }));
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response &&
        [401, 403].includes(error.response.status)
      ) {
        setError('Incorrect credentials');
      } else {
        setError((error as Error).message || 'Unknown Error');
      }
    }
  }

  return (
    <Container>
      <form onSubmit={submit}>
        <TextField
          variant="filled"
          fullWidth
          onChange={(e) => setUsername(e.target.value)}
          label="Username"
          name="username"
          autoComplete="username"
        />
        <TextField
          variant="filled"
          fullWidth
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          label="Password"
          name="password"
          autoComplete={props.action === Action.Authenticate ? 'current-password' : 'new-password'}
        />
        {error && <FormHelperText error>{error}</FormHelperText>}
        <Button variant="contained" color="primary" type="submit">
          Submit
        </Button>
        {/* TODO: network request indicator */}
      </form>
    </Container>
  );
}

export default UserAuthenticationWidget;
