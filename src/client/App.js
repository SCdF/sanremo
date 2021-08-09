import './App.scss';
import React, { useEffect } from 'react';
import { Routes } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import CssBaseline from '@material-ui/core/CssBaseline';

import db from './db';
import { set as setLoggedInUser } from './state/userSlice';

import About from './pages/About';
import History from './pages/History';
import Home from './pages/Home';
import Login from './pages/Login';
import Repeatable from './pages/Repeatable';
import Template from './pages/Template';

import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import { CircularProgress } from '@material-ui/core';
import Page from './components/Page';

const theme = createMuiTheme({
  // palette: {
  //   primary: {
  //     main: '#f5df4d',
  //   },
  //   secondary: {
  //     main: '#939597',
  //   },
  // },
});

function App() {
  const loggedInUser = useSelector((state) => state.user.value);
  const dispatch = useDispatch();

  useEffect(() => {
    // FIXME: we don't want to actually do this. Instead, either:
    // - remap this URL to an /api/ok or something that doesn't involve anything except validating the session,
    // - rely entirely on actual remote calls to fail as they fail to trigger a login request
    // And with either option know the difference between being offline and not authed
    // FIXME: check a client-side cookie for this. Without this check we can't support offline first!
    async function authCheck() {
      const response = await fetch('/api/auth');
      if (response.ok) {
        const data = await response.json();
        dispatch(setLoggedInUser(data.user));
      } else {
        dispatch(setLoggedInUser(false));
      }
    }

    if (process.env.NODE_ENV === 'development') {
      dispatch(setLoggedInUser('dev'));
    } else if (loggedInUser === undefined) {
      authCheck();
    }
  }, [dispatch, loggedInUser]);

  if (loggedInUser === undefined) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <CircularProgress />
      </ThemeProvider>
    );
  }

  if (!loggedInUser) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Login setLoggedInUser={setLoggedInUser} />
      </ThemeProvider>
    );
  }

  const handle = db(loggedInUser);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Page db={handle}>
        <Routes>
          <Home db={handle} path="/" />
          <About db={handle} path="/about" />
          <Repeatable db={handle} path="repeatable/:repeatableId" />
          <Template db={handle} path="template/:templateId" />
          <History db={handle} path="history" />
        </Routes>
      </Page>
    </ThemeProvider>
  );
}

export default App;
