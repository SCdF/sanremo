import { screen, waitFor } from '@testing-library/react';
import axios, { type CancelTokenSource } from 'axios';
import { MemoryRouter } from 'react-router';
import type { AnyAction, Store } from 'redux';

import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import { createStore, type RootState } from '../../store';
import { withStore, render as wrappedRender } from '../../test-utils';
import UserProvider from './UserProvider';
import { GuestUser } from './userSlice';

vi.mock('axios');

const mockedAxios = axios as Mocked<typeof axios>;

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
    // in theory we can change the jest mock of axios to do a partial mock
    // however, this messes with the mocked function that we used to get mockedAxios
    mockedAxios.isAxiosError.mockImplementation((e) => e.isAxiosError);
    mockedAxios.isCancel.mockImplementation((e) => e.isCancel);
    mockedAxios.CancelToken.source = vi.fn(() => {
      return { cancel: () => {} } as CancelTokenSource;
    });

    store = createStore();
  });

  function render(children: React.ReactElement) {
    wrappedRender(withStore(store, <MemoryRouter>{children}</MemoryRouter>));
  }

  it('loads user with valid server credentials', async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = CLIENT_COOKIE;
    mockedAxios.get.mockResolvedValueOnce({ data: serverUser });

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(serverUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalsy();
  });
  it('loads user with invalid server credentials but valid client cookie', async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = CLIENT_COOKIE;
    mockedAxios.get.mockRejectedValue({ response: { status: 401 }, isAxiosError: true });

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(clientUser);
    expect(store.getState().user.needsServerAuthentication).toBeTruthy();
  });
  it('loads user with a down server but valid client cookie', async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = CLIENT_COOKIE;
    mockedAxios.get.mockRejectedValue({ response: { status: 404 }, isAxiosError: true });

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(clientUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalsy();
  });
  it('loads user with network issues but valid client cookie', async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = CLIENT_COOKIE;
    mockedAxios.get.mockRejectedValue({ who: 'knows', isAxiosError: true });

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(clientUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalsy();
  });
  it('loads user with an unresponsive server but valid client cookie', async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = CLIENT_COOKIE;
    mockedAxios.get.mockRejectedValue({ isCancel: true });

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(clientUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalsy();
  });
  it('treats no client cookie as the user being a guest', async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = NO_CLIENT_COOKIE;
    mockedAxios.get.mockResolvedValueOnce({ data: serverUser });

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(GuestUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalsy();
  });
  it('for now, treat to corrupted client cookie as the user being a guest', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = 'sanremo-client=blah';
    mockedAxios.get.mockResolvedValueOnce({ data: serverUser });

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(console.error).toBeCalledTimes(1);
    expect(store.getState().user.value).toStrictEqual(GuestUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalsy();
  });
});
