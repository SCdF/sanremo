import { screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { MemoryRouter } from 'react-router';
import type { AnyAction, Store } from 'redux';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, type RootState } from '../../store';
import { withStore, render as wrappedRender } from '../../test-utils';
import { server } from '../../test-utils/msw-server';
import UserProvider from './UserProvider';
import { GuestUser } from './userSlice';

const serverUser = { id: 1, name: 'Tester Test' };
const clientUser = { id: 1, name: 'test' };
const NO_CLIENT_COOKIE = 'sanremo-client=';
const CLIENT_COOKIE =
  'sanremo-client=s%3Aj%3A%7B%22id%22%3A1%2C%22name%22%3A%22test%22%7D.n%2BTOXdVN4pxjHo%2F3u8aOxEac6bRJWWASfUji1PBbJBM';

// While this is in the user feature directory, it currently renders App, and is more a functional test
// This should probably be moved somewhere else? Or refactored to just use the UserProvider?
describe('user authentication', () => {
  let store: Store<RootState, AnyAction>;

  beforeEach(() => {
    store = createStore();
  });

  function render(children: React.ReactElement) {
    wrappedRender(withStore(store, <MemoryRouter>{children}</MemoryRouter>));
  }

  it('loads user with valid server credentials', async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = CLIENT_COOKIE;
    server.use(
      http.get('/api/auth', () => {
        return HttpResponse.json(serverUser);
      }),
    );

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(serverUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalsy();
  });

  it('loads user with invalid server credentials but valid client cookie', async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = CLIENT_COOKIE;
    server.use(
      http.get('/api/auth', () => {
        return HttpResponse.json(null, { status: 401 });
      }),
    );

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(clientUser);
    expect(store.getState().user.needsServerAuthentication).toBeTruthy();
  });

  it('loads user with a down server but valid client cookie', async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = CLIENT_COOKIE;
    server.use(
      http.get('/api/auth', () => {
        return HttpResponse.json(null, { status: 404 });
      }),
    );

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(clientUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalsy();
  });

  it('loads user with network issues but valid client cookie', async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = CLIENT_COOKIE;
    server.use(
      http.get('/api/auth', () => {
        return HttpResponse.error();
      }),
    );

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(clientUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalsy();
  });

  it('treats no client cookie as the user being a guest', async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = NO_CLIENT_COOKIE;
    server.use(
      http.get('/api/auth', () => {
        return HttpResponse.json(serverUser);
      }),
    );

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(GuestUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalsy();
  });

  it('for now, treat to corrupted client cookie as the user being a guest', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = 'sanremo-client=blah';
    server.use(
      http.get('/api/auth', () => {
        return HttpResponse.json(serverUser);
      }),
    );

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(console.error).toBeCalledTimes(1);
    expect(store.getState().user.value).toStrictEqual(GuestUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalsy();
  });
});
