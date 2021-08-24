import { Button, Container, FormHelperText, TextField } from '@material-ui/core';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

import { set as setLoggedInUser } from '../state/userSlice';

function Login() {
  const dispatch = useDispatch();

  const [username, setUsername] = useState();
  const [password, setPassword] = useState();

  const [error, setError] = useState();

  async function submit(event) {
    event.preventDefault();

    if (!username) {
      return setError('No username!');
    }

    if (!password) {
      return setError('No password!');
    }

    // TODO: replace with axios, deal with offline etc better
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    }).catch((err) => ({ status: 404 }));

    if (response.status === 400) {
      return setError('Cannot find server. Offline?');
    }

    if (response.status >= 500) {
      return setError('Something went wrong, try again later');
    }

    if (!response.ok) {
      return setError('Incorrect credentials');
    }

    // In theory we're all good now?
    const user = await response.json();
    dispatch(setLoggedInUser(user));
  }

  return (
    <Container>
      <h1>Project Sanremo</h1>
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
          autoComplete="current-password"
        />
        {error && (
          <FormHelperText error fullWidth>
            {error}
          </FormHelperText>
        )}
        <Button variant="contained" color="primary" type="submit">
          Submit
        </Button>
      </form>
    </Container>
  );
}

export default Login;
