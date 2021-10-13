import axios, { CancelTokenSource } from 'axios';
import { createStore, RootState } from '../../store';
import { render as renderRtl, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { Store, AnyAction } from 'redux';
import { MemoryRouter } from 'react-router';
import { mocked } from 'ts-jest/utils';
import UserProvider from './UserProvider';
import { GuestUser } from './userSlice';

jest.mock('axios');

const mockedAxios = mocked(axios, true);

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
    mockedAxios.CancelToken.source.mockImplementation(() => {
      return { cancel: () => {} } as CancelTokenSource;
    });

    store = createStore();
  });

  function render(children: React.ReactElement) {
    renderRtl(
      <Provider store={store}>
        <MemoryRouter>{children}</MemoryRouter>
      </Provider>
    );
  }

  it('loads user with valid server credentials', async () => {
    document.cookie = CLIENT_COOKIE;
    mockedAxios.get.mockResolvedValueOnce({ data: serverUser });

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(serverUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalse();
  });
  it('loads user with invalid server credentials but valid client cookie', async () => {
    document.cookie = CLIENT_COOKIE;
    mockedAxios.get.mockRejectedValue({ response: { status: 401 }, isAxiosError: true });

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(clientUser);
    expect(store.getState().user.needsServerAuthentication).toBeTrue();
  });
  it('loads user with a down server but valid client cookie', async () => {
    document.cookie = CLIENT_COOKIE;
    mockedAxios.get.mockRejectedValue({ response: { status: 404 }, isAxiosError: true });

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(clientUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalse();
  });
  it('loads user with network issues but valid client cookie', async () => {
    document.cookie = CLIENT_COOKIE;
    mockedAxios.get.mockRejectedValue({ who: 'knows', isAxiosError: true });

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(clientUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalse();
  });
  it('loads user with an unresponsive server but valid client cookie', async () => {
    document.cookie = CLIENT_COOKIE;
    mockedAxios.get.mockRejectedValue({ isCancel: true });

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(clientUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalse();
  });
  it('treats no client cookie as the user being a guest', async () => {
    document.cookie = NO_CLIENT_COOKIE;
    mockedAxios.get.mockResolvedValueOnce({ data: serverUser });

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(GuestUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalse();
  });
  it('for now, treat to corrupted client cookie as the user being a guest', async () => {
    document.cookie = 'sanremo-client=blah';
    mockedAxios.get.mockResolvedValueOnce({ data: serverUser });

    render(<UserProvider>some text</UserProvider>);
    await waitFor(() => screen.getByText(/some text/));

    expect(store.getState().user.value).toStrictEqual(GuestUser);
    expect(store.getState().user.needsServerAuthentication).toBeFalse();
  });
});
