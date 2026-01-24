import { screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import { when } from 'vitest-when';
import { type RepeatableDoc, SlugType, type TemplateDoc } from '../shared/types';
import App from './App';
import db, { type Database } from './db';
import { setUserAsLoggedIn } from './features/User/userSlice';
import { createStore } from './store';
import { render, withStore } from './test-utils';
import { server } from './test-utils/msw-server';

// Mock the database
vi.mock('./db');

describe('App Routing', () => {
  let store: ReturnType<typeof createStore>;
  let handle: Mocked<Database>;

  // Client cookie for a logged-in user (same format as UserProvider.test.tsx)
  const CLIENT_COOKIE =
    'sanremo-client=s%3Aj%3A%7B%22id%22%3A1%2C%22name%22%3A%22testuser%22%7D.n%2BTOXdVN4pxjHo%2F3u8aOxEac6bRJWWASfUji1PBbJBM';

  beforeEach(() => {
    store = createStore();

    // Set user as logged in BEFORE creating db handle
    // This ensures components use the correct user context
    store.dispatch(setUserAsLoggedIn({ user: { id: 1, name: 'testuser' } }));

    // Create the database handle mock
    // Note: db() caches handles by user ID, so calling db() with the same user
    // will return the same handle instance throughout the test
    handle = db({ id: 1, name: 'testuser' }) as Mocked<Database>;

    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = CLIENT_COOKIE;

    handle.allDocs.mockResolvedValue({ rows: [], total_rows: 0, offset: 0 });

    // Mock database responses for Home page
    // Home component makes multiple find() calls with different selectors,
    // so we need mockImplementation to handle each query pattern
    handle.find.mockImplementation((_options) => {
      // Return empty arrays for all queries (templates and repeatables)
      return Promise.resolve({ docs: [] });
    });

    // Mock /api/auth to return the logged-in user
    server.use(
      http.get('/api/auth', () => {
        return HttpResponse.json({ id: 1, name: 'testuser' });
      }),
    );
  });

  afterEach(() => {
    // Clean up cookies between tests
    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = '';

    // Clear mock call history but keep implementations
    vi.clearAllMocks();
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

    // Should render the home page by default
    await waitFor(
      () => {
        expect(screen.getByTestId('home-templates-list')).toBeTruthy();
      },
      { timeout: 10000 }, // Increased timeout to debug timing issues
    );
  });

  it('should handle /repeatable/:id route', async () => {
    // Mock for repeatable page
    const mockRepeatable: RepeatableDoc = {
      _id: 'test-id',
      template: 'repeatable:template:test',
      values: {},
      created: Date.now(),
      updated: Date.now(),
      slug: '',
      schemaVersion: 2,
    };

    const mockTemplate: TemplateDoc = {
      _id: 'repeatable:template:test',
      title: 'Test Template',
      markdown: '- [ ] Test item <!-- cb:cb1 -->',
      slug: { type: SlugType.Date },
      created: Date.now(),
      updated: Date.now(),
      versioned: Date.now(),
      values: [{ id: 'cb1', default: false }],
      schemaVersion: 2,
    };

    // Repeatable page calls handle.get with the route param (just 'test-id')
    // biome-ignore lint/suspicious/noExplicitAny: PouchDB.get has overloaded signatures; using any for vitest-when compatibility
    when(handle.get as any)
      .calledWith('test-id')
      .thenResolve(mockRepeatable);
    // Then it loads the template using the template ID from the repeatable
    // biome-ignore lint/suspicious/noExplicitAny: PouchDB.get has overloaded signatures; using any for vitest-when compatibility
    when(handle.get as any)
      .calledWith('repeatable:template:test')
      .thenResolve(mockTemplate);

    render(
      withStore(
        store,
        <MemoryRouter initialEntries={['/repeatable/test-id']}>
          <App />
        </MemoryRouter>,
      ),
    );

    // Should render the repeatable page with Complete button
    await waitFor(() => {
      expect(screen.getByTestId('repeatable-page')).toBeTruthy();
      expect(screen.getByText('Complete')).toBeTruthy();
    });
  });

  it('should handle /template/:id route', async () => {
    // Mock for template page
    const mockTemplate: TemplateDoc = {
      _id: 'repeatable:template:test',
      title: 'Test Template',
      markdown: 'Test markdown',
      values: [],
      slug: { type: SlugType.Date },
      created: Date.now(),
      updated: Date.now(),
      versioned: Date.now(),
      schemaVersion: 2,
    };

    // biome-ignore lint/suspicious/noExplicitAny: PouchDB.get has overloaded signatures; using any for vitest-when compatibility
    when(handle.get as any)
      .calledWith('repeatable:template:test')
      .thenResolve(mockTemplate);

    render(
      withStore(
        store,
        <MemoryRouter initialEntries={['/template/repeatable:template:test']}>
          <App />
        </MemoryRouter>,
      ),
    );

    // Should render the template edit page with form
    await waitFor(() => {
      expect(screen.getByTestId('template-page')).toBeTruthy();
      expect(screen.getByLabelText(/title/i)).toBeTruthy();
      expect(screen.getByText('Save')).toBeTruthy();
    });
  });

  it('should handle /history route', async () => {
    // Mock for history page
    handle.find.mockResolvedValue({
      docs: [],
    });

    render(
      withStore(
        store,
        <MemoryRouter initialEntries={['/history']}>
          <App />
        </MemoryRouter>,
      ),
    );

    // Should render the history page with empty state message
    await waitFor(() => {
      expect(screen.getByTestId('history-page')).toBeTruthy();
      expect(screen.getByText(/Nothing here yet/i)).toBeTruthy();
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

    // Should render the home page (fallback route)
    await waitFor(() => {
      expect(screen.getByTestId('home-templates-list')).toBeTruthy();
    });
  });

  it('should show guest user message when user is guest', async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: Required for dual-cookie auth testing
    document.cookie = 'sanremo-client=';

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

    // Should render home page and not show guest warning
    await waitFor(() => {
      expect(screen.getByTestId('home-templates-list')).toBeTruthy();
    });

    // Guest message should not be present
    expect(screen.queryByText(/Data only stored in this browser/i)).toBeNull();
  });
});
