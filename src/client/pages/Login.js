import { Button, Container, FormHelperText, TextField } from '@material-ui/core';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

import { set as setLoggedInUser } from '../state/userSlice';

function Login() {
  const dispatch = useDispatch();

  const [username, setUsername] = useState();
  const [password, setPassword] = useState();

  const [error, setError] = useState();

  async function submit() {
    if (!username) {
      return setError('No username!');
    }

    if (!password) {
      return setError('No password!');
    }

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
    const data = await response.json();
    dispatch(setLoggedInUser(data.user));
  }

  return (
    <Container>
      <h1>Project Sanremo</h1>
      <p>Create a new account or log in with an existing one.</p>
      <TextField
        variant="filled"
        fullWidth
        onChange={(e) => setUsername(e.target.value)}
        label="Username"
        name="username"
      />
      <TextField
        variant="filled"
        fullWidth
        type="password"
        onChange={(e) => setPassword(e.target.value)}
        label="Password"
        name="password"
      />
      {error && (
        <FormHelperText error fullWidth>
          {error}
        </FormHelperText>
      )}
      <Button variant="contained" color="primary" onClick={submit}>
        Submit
      </Button>
    </Container>
  );
}

export default Login;
