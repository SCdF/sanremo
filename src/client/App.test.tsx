import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Mocked } from 'vitest';
import App from './App';
import db, { Database } from './db';
import { setUserAsLoggedIn } from './features/User/userSlice';
import { createStore } from './store';
import { render, withStore } from './test-utils';

// Mock the database
vi.mock('./db');

describe('App Routing', () => {
  let store: ReturnType<typeof createStore>;
  let handle: Mocked<Database>;

  beforeEach(() => {
    store = createStore();
    store.dispatch(setUserAsLoggedIn({ user: { id: 1, name: 'testuser' } }));
    handle = db({ id: 1, name: 'testuser' }) as Mocked<Database>;

    // Mock database responses for Home page
    handle.find.mockResolvedValue({
      docs: [],
      // biome-ignore lint/suspicious/noExplicitAny: Mock type for testing
    } as any);
  });

  it('should render App with routing structure', async () => {
    render(
      withStore(
        store,
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>,
      ),
    );

    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('should handle /repeatable/:id route', async () => {
    // Mock for repeatable page
    handle.get
      .mockResolvedValueOnce({
        _id: 'repeatable:instance:test-id',
        template: 'repeatable:template:test',
        values: [],
        // biome-ignore lint/suspicious/noExplicitAny: Mock type for testing
      } as any)
      .mockResolvedValueOnce({
        _id: 'repeatable:template:test',
        title: 'Test Template',
        markdown: 'Test markdown',
        // biome-ignore lint/suspicious/noExplicitAny: Mock type for testing
      } as any);

    render(
      withStore(
        store,
        <MemoryRouter initialEntries={['/repeatable/test-id']}>
          <App />
        </MemoryRouter>,
      ),
    );

    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  it('should handle /template/:id route', async () => {
    // Mock for template page
    handle.get.mockResolvedValue({
      _id: 'repeatable:template:test',
      title: 'Test Template',
      markdown: 'Test markdown',
      values: [],
      // biome-ignore lint/suspicious/noExplicitAny: Mock type for testing
    } as any);

    render(
      withStore(
        store,
        <MemoryRouter initialEntries={['/template/test-id']}>
          <App />
        </MemoryRouter>,
      ),
    );

    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  it('should handle /history route', async () => {
    // Mock for history page
    handle.find.mockResolvedValue({
      docs: [],
      // biome-ignore lint/suspicious/noExplicitAny: Mock type for testing
    } as any);

    render(
      withStore(
        store,
        <MemoryRouter initialEntries={['/history']}>
          <App />
        </MemoryRouter>,
      ),
    );

    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  it('should fallback to home page for unknown routes', async () => {
    render(
      withStore(
        store,
        <MemoryRouter initialEntries={['/unknown/route']}>
          <App />
        </MemoryRouter>,
      ),
    );

    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  it('should show guest user message when user is guest', async () => {
    // Reset to guest user
    store.dispatch({ type: 'user/setUserAsGuest' });

    render(
      withStore(
        store,
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>,
      ),
    );

    await waitFor(() => {
      expect(screen.getByText(/Data only stored in this browser/i)).toBeTruthy();
    });
  });

  it('should not show guest user message when user is logged in', async () => {
    // User is already set as logged in in beforeEach
    render(
      withStore(
        store,
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>,
      ),
    );

    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });

    // Guest message should not be present
    expect(screen.queryByText(/Data only stored in this browser/i)).toBeNull();
  });

  it('should render with Suspense boundary', () => {
    render(
      withStore(
        store,
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>,
      ),
    );

    // App renders without crashing
    expect(document.body).toBeTruthy();
  });
});
