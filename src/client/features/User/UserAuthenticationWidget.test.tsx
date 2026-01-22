import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import type { AnyAction, Store } from 'redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '../../../shared/types';
import { createStore, type RootState } from '../../store';
import { withStore, render as wrappedRender } from '../../test-utils';
import { server } from '../../test-utils/msw-server';
import UserAuthenticationWidget, { Action } from './UserAuthenticationWidget';
import { GuestUser, setUserAsGuest } from './userSlice';

vi.mock('../../db', () => ({
  default: vi.fn(),
  migrateFromGuest: vi.fn().mockResolvedValue(undefined),
}));

const testUser: User = { id: 1, name: 'testuser' };

describe('UserAuthenticationWidget', () => {
  let store: Store<RootState, AnyAction>;

  beforeEach(() => {
    store = createStore();
    store.dispatch(setUserAsGuest());
  });

  function render(action: Action, username?: string) {
    wrappedRender(
      withStore(store, <UserAuthenticationWidget action={action} username={username} />),
    );
  }

  async function fillAndSubmit(username: string, password: string) {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), username);
    await user.type(screen.getByLabelText(/password/i), password);
    await user.click(screen.getByRole('button', { name: /submit/i }));
  }

  describe('login (Authenticate)', () => {
    it('logs in successfully with valid credentials', async () => {
      server.use(
        http.post('/api/auth', () => {
          return HttpResponse.json(testUser);
        }),
      );

      render(Action.Authenticate);
      await fillAndSubmit('testuser', 'password123');

      await waitFor(() => {
        expect(store.getState().user.value).toEqual(testUser);
      });
    });

    it('displays error on 401 response', async () => {
      server.use(
        http.post('/api/auth', () => {
          return HttpResponse.json(null, { status: 401 });
        }),
      );

      render(Action.Authenticate);
      await fillAndSubmit('testuser', 'wrongpassword');

      await waitFor(() => {
        expect(screen.getByText(/incorrect credentials/i)).toBeInTheDocument();
      });
      expect(store.getState().user.value).toEqual(GuestUser);
    });

    it('displays error on 403 response', async () => {
      server.use(
        http.post('/api/auth', () => {
          return HttpResponse.json(null, { status: 403 });
        }),
      );

      render(Action.Authenticate);
      await fillAndSubmit('testuser', 'wrongpassword');

      await waitFor(() => {
        expect(screen.getByText(/incorrect credentials/i)).toBeInTheDocument();
      });

      expect(store.getState().user.value).toEqual(GuestUser);
    });

    it('displays server error message on other errors', async () => {
      server.use(
        http.post('/api/auth', () => {
          return HttpResponse.json(null, { status: 500 });
        }),
      );

      render(Action.Authenticate);
      expect(store.getState().user.value).toEqual(GuestUser);
      await fillAndSubmit('testuser', 'password123');

      await waitFor(() => {
        expect(screen.getByText(/500/i)).toBeInTheDocument();
      });

      expect(store.getState().user.value).toEqual(GuestUser);
    });

    it('displays network error on connection failure', async () => {
      server.use(
        http.post('/api/auth', () => {
          return HttpResponse.error();
        }),
      );

      render(Action.Authenticate);
      await fillAndSubmit('testuser', 'password123');

      // Network errors show the error message (varies by environment, but always shown)
      await waitFor(() => {
        const errorElement = screen.getByRole('paragraph');
        expect(errorElement).toHaveClass('Mui-error');
      });

      expect(store.getState().user.value).toEqual(GuestUser);
    });
  });

  describe('signup (Create)', () => {
    it('creates account successfully', async () => {
      server.use(
        http.put('/api/auth', () => {
          return HttpResponse.json(testUser);
        }),
      );

      render(Action.Create);
      await fillAndSubmit('newuser', 'newpassword');

      await waitFor(() => {
        expect(store.getState().user.value).toEqual(testUser);
      });
    });

    it('displays error on 401 response during signup', async () => {
      server.use(
        http.put('/api/auth', () => {
          return HttpResponse.json(null, { status: 401 });
        }),
      );

      render(Action.Create);
      await fillAndSubmit('existinguser', 'password');

      await waitFor(() => {
        expect(screen.getByText(/incorrect credentials/i)).toBeInTheDocument();
      });

      expect(store.getState().user.value).toEqual(GuestUser);
    });
  });

  describe('validation', () => {
    it('shows error when username is empty', async () => {
      render(Action.Authenticate);
      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/no username/i)).toBeInTheDocument();
      });
    });

    it('shows error when password is empty', async () => {
      render(Action.Authenticate);
      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/no password/i)).toBeInTheDocument();
      });
    });
  });

  describe('autocomplete attributes', () => {
    it('uses current-password for login', () => {
      render(Action.Authenticate);
      expect(screen.getByLabelText(/password/i)).toHaveAttribute(
        'autocomplete',
        'current-password',
      );
    });

    it('uses new-password for signup', () => {
      render(Action.Create);
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('autocomplete', 'new-password');
    });
  });
});
