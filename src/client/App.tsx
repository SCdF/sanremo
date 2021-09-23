import './App.scss';

import { debugClient } from './globals';

import cookie from 'cookie';
import axios from 'axios';

import React, { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';

import CssBaseline from '@material-ui/core/CssBaseline';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import { CircularProgress, Typography } from '@material-ui/core';

import db, { Database } from './db';
import { setUserAsLoggedIn, setUserAsGuest, selectIsGuest } from './features/User/userSlice';

import About from './pages/About';
import History from './pages/History';
import Home from './pages/Home';
import Repeatable from './pages/Repeatable';
import Template from './pages/Template';
import Page from './features/Page/Page';
import DebugManager from './features/Debug/DebugManager';
import UpdateManager from './features/Update/UpdateManager';
import SyncManager from './features/Sync/SyncManager';
import { useDispatch, useSelector } from './store';
import { User } from '../shared/types';

const debug = debugClient('auth');

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
  const dispatch = useDispatch();
  const loggedInUser = useSelector((state) => state.user.value);
  const isGuest = useSelector(selectIsGuest);

  const [handle, setHandle] = useState(undefined as unknown as Database);

  useEffect(() => {
    if (loggedInUser) setHandle(db(loggedInUser));
  }, [loggedInUser]);

  useEffect(() => {
    // Check the server for authentication against the server-side cookie
    async function networkCheck(): Promise<User | 'network_error' | void> {
      debug('server authentication check');
      const source = axios.CancelToken.source();
      setTimeout(() => source.cancel(), 1000);
      try {
        const response = await axios.get('/api/auth', { cancelToken: source.token });
        debug('got valid server response');
        return response.data;
      } catch (error) {
        if (axios.isCancel(error)) {
          debug('server authentication check timed out');
          return 'network_error';
        } else if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            // authentication failed, either because they have no cookie or because it's wrong / outdated
            debug('server authentication check failed');
          } else {
            debug('unknown axios error');
            console.warn(error);
          }
        } else {
          console.error('unexpected error in networkCheck', error, source);
          throw error;
        }
      }
    }

    // Parse the user from the client-side cookie.
    function localCookieCheck(): User | void {
      debug('local cookie check');
      try {
        // 's:j:{...data...}.<secret-signed-signature>'
        const clientCookie = cookie.parse(document.cookie)['sanremo-client'];
        if (clientCookie) {
          // '{...data...}.<secret-signed-signature>'
          const frontStripped = clientCookie.slice(4);
          // '{...data...}'
          const backStripped = frontStripped.slice(0, frontStripped.lastIndexOf('.'));
          const user: User = JSON.parse(backStripped);
          return user;
        } else {
          // no client cookie at all means not logged in
          debug('no local cookie found');
        }
      } catch (error) {
        // Something went wrong with parsing. This indicates a bug or nefarious behaviour.
        // Treat as logged out, though maybe we should consider something stronger here.
        debug('failed to parse cookie, corrupted?');
        console.error('Failed to parse user from client cookie', error);
      }
    }

    async function determineUserState() {
      const localUserCheck = localCookieCheck();
      const serverUserCheck = await networkCheck();

      if (!localUserCheck) {
        // Intentionally not logged in
        debug('not logged in, proceeding as guest');
        dispatch(setUserAsGuest());
      } else if (serverUserCheck === 'network_error') {
        // Offline with a valid local user
        debug('probably offline with valid local user, proceeding as user');
        dispatch(setUserAsLoggedIn({ user: localUserCheck }));
      } else if (!serverUserCheck) {
        // Server auth was unsuccessful, but we have a valid local (and thus insecure) cookie:
        //     This could imply normal things: the user being offline for weeks, the server changing secrets
        //     Or it could imply someone trying to log in with a stolen local cookie
        // TODO: check for the existence of a local database. If it doesn't exist, that means the user is a bad hacker man probably
        //       This isn't really a security issue: they still don't have server access, and if they have access to the client machine
        //       they have access to any indexeddb data on their regardless of cookie hacks.
        //       Worst case this is a weird logic issue: steal userA's local cookie, deploy it write to sanremo-a, then log in as userB
        //       and "lose" your work against sanremo-a as you'll now use sanremo-b.
        // For now though, proceed like it's valid, but mark the user as requiring re-auth with the server
        debug(
          'server auth unsuccessful, local cookie valid, proceeding as user on existing local data'
        );
        dispatch(setUserAsLoggedIn({ user: localUserCheck, needsServerAuthentication: true }));
      } else {
        // Server auth (+ client cookie as it's validated on the server) was successful
        debug('online with validated user, proceeding as user');
        dispatch(setUserAsLoggedIn({ user: localUserCheck }));
      }
    }

    determineUserState();
  }, [dispatch]);

  if (loggedInUser === undefined || !handle) {
    // still booting up
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <CircularProgress />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DebugManager />
      {process.env.NODE_ENV !== 'development' && !isGuest && <SyncManager db={handle} />}
      {process.env.NODE_ENV !== 'development' && <UpdateManager />}
      <Page db={handle}>
        <Routes>
          <Route path="/" element={<Home db={handle} path="/" />} />
          <Route path="/about" element={<About db={handle} />} />
          <Route path="repeatable/:repeatableId" element={<Repeatable db={handle} />} />
          <Route path="template/:templateId" element={<Template db={handle} />} />
          <Route path="history" element={<History db={handle} />} />
        </Routes>
        {isGuest && (
          <Typography align="center" variant="caption" color="textSecondary" display="block">
            Local account. Your data is only stored in this browser. Create an account to allow it
            to be accessed on multiple devices.
          </Typography>
        )}
      </Page>
    </ThemeProvider>
  );
}

export default App;
