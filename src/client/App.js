import './App.scss';

import debugModule from 'debug';

import cookie from 'cookie';
import axios, { CancelToken } from 'axios';

import React, { useEffect } from 'react';
import { Routes } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import CssBaseline from '@material-ui/core/CssBaseline';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import { CircularProgress } from '@material-ui/core';

import db from './db';
import { set as setLoggedInUser } from './features/User/userSlice';

import About from './pages/About';
import History from './pages/History';
import Home from './pages/Home';
import Login from './pages/Login';
import Repeatable from './pages/Repeatable';
import Template from './pages/Template';
import Page from './features/Page/Page';
import DebugManager from './features/Debug/DebugManager';
import UpdateManager from './features/Update/UpdateManager';
import SyncManager from './features/Sync/SyncManager';

const debugAuth = debugModule('sanremo:client:auth');

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
    // Parse the user from the client-side cookie.
    function localCookieCheck() {
      debugAuth('local cookie parsing fallback');
      try {
        // 's:j:{...json...}.signature'
        const clientCookie = cookie.parse(document.cookie)['sanremo-client'];
        if (!clientCookie) {
          return false;
        }
        // '{...json...}.signature'
        const frontStripped = clientCookie.slice(4);
        // '{...json...}'
        const backStripped = frontStripped.slice(0, frontStripped.lastIndexOf('.'));
        const user = JSON.parse(backStripped);
        return user;
      } catch (error) {
        console.error('Failed to parse user from client cookie', error);
        return false;
      }
    }
    async function networkCheck() {
      debugAuth('server authentication check');
      const source = CancelToken.source();
      setTimeout(() => source.cancel(), 2000);
      try {
        const response = await axios('/api/auth', { cancelToken: source.token });
        return response.data;
      } catch (error) {
        if (error.response?.status === 401) {
          debugAuth('server authentication check failed');
          return false; // authentication failed
        }
        debugAuth('server authentication unavailable');
        console.warn(error);
        return; // service is unavailable
      }
    }
    async function auth() {
      let user = await networkCheck();
      if (user === undefined) {
        user = localCookieCheck();
      }

      debugAuth(`setting user to ${JSON.stringify(user)}`);
      dispatch(setLoggedInUser(user));
    }

    if (process.env.NODE_ENV === 'development') {
      dispatch(setLoggedInUser('dev'));
    } else if (loggedInUser === undefined) {
      auth();
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
        <Login />
      </ThemeProvider>
    );
  }

  const handle = db(loggedInUser);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DebugManager />
      <UpdateManager />
      {process.env.NODE_ENV !== 'development' && <SyncManager db={handle} />}
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
