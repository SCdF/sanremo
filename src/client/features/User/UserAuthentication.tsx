import PouchDB from 'pouchdb-browser';
import { Button, Container, FormHelperText, TextField } from '@material-ui/core';
import { FormEvent, useState } from 'react';
import { useDispatch } from 'react-redux';

import { setUserAsLoggedIn } from './userSlice';
import axios from 'axios';
import { User } from '../../../shared/types';

export enum Action {
  Create,
  Authenticate,
}
function UserAuthentication(props: { username?: string; action: Action }) {
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
        }
      );
      const user: User = response.data;

      if (props.action === Action.Create) {
        // pre-create local database and put existing data in it
        // TODO: move this elsewhere, db.ts probably
        const local = new PouchDB(`sanremo-${user.name}`);
        const guest = new PouchDB('sanremo-guest');
        await guest.replicate.to(local);
        await guest.destroy();
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

  // FIXME: tab to move between fields doesn't work here for some reason
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

export default UserAuthentication;
