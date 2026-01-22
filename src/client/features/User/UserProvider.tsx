import cookie from 'cookie';
import type React from 'react';
import { type FC, Fragment, useEffect } from 'react';
import type { User } from '../../../shared/types';
import { debugClient } from '../../globals';
import Loading from '../../Loading';
import { useDispatch, useSelector } from '../../store';
import { setUserAsGuest, setUserAsLoggedIn } from './userSlice';

const debug = debugClient('auth');

const UserProvider: FC<{ children?: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();

  const user = useSelector((state) => state.user.value);

  useEffect(() => {
    // Check the server for authentication against the server-side cookie
    async function networkCheck(): Promise<User | 'auth_error' | undefined> {
      debug('server authentication check');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      try {
        const response = await fetch('/api/auth', {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            // authentication failed, either because they have no cookie or because it's wrong / outdated
            debug('server authentication check failed');
            return 'auth_error';
          }
          debug(`network issues: HTTP ${response.status}`);
          return undefined;
        }

        debug('got valid server response');
        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          debug('server authentication check timed out');
        } else {
          console.error('unexpected error in networkCheck', error);
        }
      }
    }

    // Parse the user from the client-side cookie.
    function localCookieCheck(): User | undefined {
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
        }
        // no client cookie at all means not logged in
        debug('no local cookie found');
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
      } else if (!serverUserCheck) {
        // Offline with a valid local user
        debug('probably offline with valid local user, proceeding as user');
        dispatch(setUserAsLoggedIn({ user: localUserCheck }));
      } else if (serverUserCheck === 'auth_error') {
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
          'server auth unsuccessful, local cookie valid, proceeding as user on existing local data',
        );
        dispatch(setUserAsLoggedIn({ user: localUserCheck, needsServerAuthentication: true }));
      } else {
        // Server auth (+ client cookie as it's validated on the server) was successful
        debug('online with validated user, proceeding as user');
        dispatch(setUserAsLoggedIn({ user: serverUserCheck }));
      }
    }

    determineUserState();
  }, [dispatch]);

  // TODO: collapse these returns into one
  // This will look much nicer as the children will render in the background while we wait for the network
  // However, either we default to a guest while we wait for the network, or we change all components to support no database
  if (user === undefined) {
    return <Loading />;
  }

  // Fragment needed here for type compatibility
  return <Fragment>{children}</Fragment>;
};

export default UserProvider;
