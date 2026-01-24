import { screen, waitFor } from '@testing-library/react';
import type { AnyAction, Store } from 'redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setUserAsLoggedIn } from '../features/User/userSlice';
import { createStore, type RootState } from '../store';
import { render, withStore } from '../test-utils';
import About from './About';

// Mock the database with info method
vi.mock('../db', () => ({
  default: vi.fn(() => ({
    info: vi.fn().mockResolvedValue({
      db_name: 'test-db',
      doc_count: 10,
      update_seq: 5,
    }),
  })),
}));

const testUser = { id: 1, name: 'testuser' };

describe('About', () => {
  let store: Store<RootState, AnyAction>;

  beforeEach(() => {
    store = createStore();
    store.dispatch(setUserAsLoggedIn({ user: testUser }));
  });

  it('renders deployment type', async () => {
    render(withStore(store, <About />));

    await waitFor(() => {
      expect(screen.getByText(/deployment type/i)).toBeInTheDocument();
    });
  });

  it('renders section headers', async () => {
    render(withStore(store, <About />));

    await waitFor(() => {
      expect(screen.getByText('SERVER DETAILS')).toBeInTheDocument();
      expect(screen.getByText('LOCAL DETAILS')).toBeInTheDocument();
      expect(screen.getByText('DATA SYNC')).toBeInTheDocument();
      expect(screen.getByText('DEBUG')).toBeInTheDocument();
    });
  });
});
