import { act, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { AnyAction, Store } from 'redux';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import type { Doc, RepeatableDoc } from '../../../shared/types';
import { getMockDb, type MockDatabase } from '../../db/__mocks__';
import { createStore, type RootState } from '../../store';
import { render, withStore } from '../../test-utils';
import { server } from '../../test-utils/msw-server';
import { setUserAsGuest, setUserAsLoggedIn } from '../User/userSlice';
import SyncManager from './SyncManager';
import { State } from './syncSlice';

vi.mock('../../db');

type SocketEventHandler = (...args: unknown[]) => void;

interface MockSocket {
  on: Mock<(event: string, handler: SocketEventHandler) => void>;
  emit: Mock<(event: string, ...args: unknown[]) => void>;
  close: Mock<() => void>;
  connected: boolean;
}

// FIXME: improve typing here. This should be based on the actual socket.io types
const mockSocket: MockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  close: vi.fn(),
  connected: true,
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

function getSocketHandler(eventName: string): SocketEventHandler | undefined {
  const call = mockSocket.on.mock.calls.find(([event]) => event === eventName);
  if (call) {
    const [, handler] = call;
    return handler;
  }
  return undefined;
}

function hasSocketHandler(eventName: string): boolean {
  return mockSocket.on.mock.calls.some(([event]) => event === eventName);
}

const testUser = { id: 1, name: 'testuser' };

describe('SyncManager', () => {
  let store: Store<RootState, AnyAction>;
  let handle: MockDatabase;

  beforeEach(() => {
    store = createStore();
    store.dispatch(setUserAsLoggedIn({ user: testUser }));

    handle = getMockDb();

    mockSocket.on.mockReset();
    mockSocket.emit.mockReset();
    mockSocket.close.mockReset();
    mockSocket.connected = true;

    handle.changes.mockResolvedValue({
      results: [],
    });
    handle.allDocs.mockResolvedValue({
      rows: [],
      total_rows: 0,
      offset: 0,
    });
    handle.bulkDocs.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderSyncManager() {
    render(withStore(store, <SyncManager />));
  }

  describe('full sync flow', () => {
    it('completes sync successfully with no documents to sync', async () => {
      server.use(
        http.post('/api/sync/begin', () => {
          return HttpResponse.json({ server: [], client: [] });
        }),
      );

      renderSyncManager();

      // Wait for socket connection handler to be registered
      await waitFor(() => {
        expect(hasSocketHandler('connect')).toBe(true);
      });

      // Simulate socket connect
      act(() => {
        const connectHandler = getSocketHandler('connect');
        if (!connectHandler) {
          expect.unreachable('connect handler should exist');
        }
        connectHandler();
      });

      // Wait for sync to complete
      await waitFor(() => {
        expect(store.getState().sync.state).toBe(State.connected);
      });
    });

    it('sends local documents to server during sync', async () => {
      const localDoc: RepeatableDoc = {
        _id: 'repeatable:instance:123',
        _rev: '1-abc',
        template: 'repeatable:template:test',
        values: {},
        created: Date.now(),
        updated: Date.now(),
        slug: 'test',
        schemaVersion: 2,
      };

      handle.changes.mockResolvedValue({
        results: [
          {
            id: localDoc._id,
            changes: [{ rev: localDoc._rev }],
            deleted: false,
          },
        ],
      });

      handle.allDocs.mockResolvedValue({
        rows: [{ id: localDoc._id, doc: localDoc }],
        total_rows: 1,
        offset: 0,
      });

      const sentDocs: unknown[] = [];

      server.use(
        http.post('/api/sync/begin', () => {
          // Server needs our document (it's in server array = server wants these docs)
          return HttpResponse.json({
            server: [{ _id: localDoc._id, _rev: localDoc._rev }],
            client: [],
          });
        }),
        http.post('/api/sync/update', async ({ request }) => {
          const body = await request.json();
          if (body && typeof body === 'object' && 'docs' in body && Array.isArray(body.docs)) {
            sentDocs.push(...body.docs);
          }
          return HttpResponse.json({ success: true });
        }),
      );

      renderSyncManager();

      await waitFor(() => {
        expect(hasSocketHandler('connect')).toBe(true);
      });

      act(() => {
        const connectHandler = getSocketHandler('connect');
        if (!connectHandler) {
          expect.unreachable('connect handler should exist');
        }
        connectHandler();
      });

      await waitFor(() => {
        expect(store.getState().sync.state).toBe(State.connected);
      });

      // Verify the correct document was sent to the server
      expect(sentDocs).toHaveLength(1);
      expect(sentDocs[0]).toMatchObject({
        _id: localDoc._id,
        _rev: localDoc._rev,
        template: localDoc.template,
        values: localDoc.values,
        slug: localDoc.slug,
      });
    });

    it('receives documents from server during sync', async () => {
      const serverDoc: RepeatableDoc = {
        _id: 'repeatable:instance:456',
        _rev: '2-xyz',
        template: 'repeatable:template:test',
        values: { 'cb-1': true },
        created: Date.now(),
        updated: Date.now(),
        slug: 'server-doc',
        schemaVersion: 2,
      };

      // Mock local database is empty
      handle.changes.mockResolvedValue({
        results: [],
      });

      handle.allDocs.mockResolvedValue({
        rows: [],
        total_rows: 0,
        offset: 0,
      });

      server.use(
        http.post('/api/sync/begin', () => {
          // Client needs a document from server
          return HttpResponse.json({
            server: [],
            client: [serverDoc],
          });
        }),
        http.post('/api/sync/request', () => {
          return HttpResponse.json([serverDoc]);
        }),
      );

      renderSyncManager();

      // Wait for socket connection handler to be registered
      await waitFor(() => {
        expect(hasSocketHandler('connect')).toBe(true);
      });

      act(() => {
        const connectHandler = getSocketHandler('connect');
        connectHandler?.();
      });

      // Wait for sync to complete
      await waitFor(() => {
        expect(store.getState().sync.state).toBe(State.connected);
      });

      // Verify bulkDocs was called with the server document
      expect(handle.bulkDocs).toHaveBeenCalled();
      const bulkDocsCall = handle.bulkDocs.mock.calls.find(
        (call) => Array.isArray(call[0]) && call[0].some((doc: Doc) => doc._id === serverDoc._id),
      );
      expect(bulkDocsCall).toBeDefined();
      if (bulkDocsCall) {
        const [docs] = bulkDocsCall;
        const writtenDoc = docs.find((doc: Doc) => doc._id === serverDoc._id);
        expect(writtenDoc).toMatchObject({
          _id: serverDoc._id,
          _rev: serverDoc._rev,
          template: serverDoc.template,
          values: serverDoc.values,
          slug: serverDoc.slug,
        });
      }
    });

    it('handles deleted documents from server', async () => {
      const deletedDoc: Doc = {
        _id: 'repeatable:instance:789',
        _rev: '3-def',
        _deleted: true,
      };

      // Mock local database is empty
      handle.changes.mockResolvedValue({
        results: [],
      });

      handle.allDocs.mockResolvedValue({
        rows: [{ key: deletedDoc._id, error: 'not_found' }],
        total_rows: 1,
        offset: 0,
      });

      server.use(
        http.post('/api/sync/begin', () => {
          // Client needs a deleted document from server
          return HttpResponse.json({
            server: [],
            client: [deletedDoc],
          });
        }),
      );

      renderSyncManager();

      // Wait for socket connection handler to be registered
      await waitFor(() => {
        expect(hasSocketHandler('connect')).toBe(true);
      });

      act(() => {
        const connectHandler = getSocketHandler('connect');
        connectHandler?.();
      });

      // Wait for sync to complete
      await waitFor(() => {
        expect(store.getState().sync.state).toBe(State.connected);
      });

      // Verify bulkDocs was called with the deleted document
      expect(handle.bulkDocs).toHaveBeenCalled();
      const bulkDocsCall = handle.bulkDocs.mock.calls.find(
        (call) => Array.isArray(call[0]) && call[0].some((doc: Doc) => doc._id === deletedDoc._id),
      );
      expect(bulkDocsCall).toBeDefined();
      if (bulkDocsCall) {
        const [docs] = bulkDocsCall;
        const writtenDoc = docs.find((doc: Doc) => doc._id === deletedDoc._id);
        // When syncing deleted documents, the key properties are _id and _deleted
        // The _rev may not be preserved through the sync process
        expect(writtenDoc).toMatchObject({
          _id: deletedDoc._id,
          _deleted: true,
        });
      }
    });
  });

  describe('error handling', () => {
    it('handles 401 error during sync by marking user as unauthenticated', async () => {
      server.use(
        http.post('/api/sync/begin', () => {
          return HttpResponse.json(null, { status: 401 });
        }),
      );

      renderSyncManager();

      // Wait for socket connection handler to be registered
      await waitFor(() => {
        expect(hasSocketHandler('connect')).toBe(true);
      });

      act(() => {
        const connectHandler = getSocketHandler('connect');
        connectHandler?.();
      });

      // Wait for sync to fail and set unauthenticated
      await waitFor(() => {
        expect(store.getState().user.needsServerAuthentication).toBe(true);
      });

      // State should be disconnected after 401
      expect(store.getState().sync.state).toBe(State.disconnected);
    });

    it('handles 401 error during sync/update by marking user as unauthenticated', async () => {
      const localDoc: RepeatableDoc = {
        _id: 'repeatable:instance:123',
        _rev: '1-abc',
        template: 'repeatable:template:test',
        values: {},
        created: Date.now(),
        updated: Date.now(),
        slug: 'test',
        schemaVersion: 2,
      };

      handle.changes.mockResolvedValue({
        results: [
          {
            id: localDoc._id,
            changes: [{ rev: localDoc._rev }],
            deleted: false,
          },
        ],
      });

      handle.allDocs.mockResolvedValue({
        rows: [{ id: localDoc._id, doc: localDoc }],
        total_rows: 1,
        offset: 0,
      });

      server.use(
        http.post('/api/sync/begin', () => {
          return HttpResponse.json({
            server: [{ _id: localDoc._id, _rev: localDoc._rev }],
            client: [],
          });
        }),
        http.post('/api/sync/update', () => {
          return HttpResponse.json(null, { status: 401 });
        }),
      );

      renderSyncManager();

      // Wait for socket connection handler to be registered
      await waitFor(() => {
        expect(hasSocketHandler('connect')).toBe(true);
      });

      act(() => {
        const connectHandler = getSocketHandler('connect');
        connectHandler?.();
      });

      // Wait for sync to fail and set unauthenticated
      await waitFor(() => {
        expect(store.getState().user.needsServerAuthentication).toBe(true);
      });
    });

    it('handles other server errors gracefully', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      server.use(
        http.post('/api/sync/begin', () => {
          return HttpResponse.json(null, { status: 500 });
        }),
      );

      renderSyncManager();

      // Wait for socket connection handler to be registered
      await waitFor(() => {
        expect(hasSocketHandler('connect')).toBe(true);
      });

      act(() => {
        const connectHandler = getSocketHandler('connect');
        connectHandler?.();
      });

      // Wait for sync to fail with error state
      await waitFor(() => {
        const syncState = store.getState().sync;
        expect(syncState.state).toBe(State.error);
      });

      // User should NOT be marked as unauthenticated for non-401 errors
      expect(store.getState().user.needsServerAuthentication).toBe(false);
    });
  });

  describe('socket events', () => {
    it('handles docUpdate from server', async () => {
      const updatedDoc: RepeatableDoc = {
        _id: 'repeatable:instance:live-update',
        _rev: '1-live',
        template: 'repeatable:template:test',
        values: { 'cb-1': true, 'cb-2': false },
        created: Date.now(),
        updated: Date.now(),
        slug: 'live-update',
        schemaVersion: 2,
      };

      handle.allDocs.mockResolvedValue({
        rows: [],
        total_rows: 0,
        offset: 0,
      });

      server.use(
        http.post('/api/sync/begin', () => {
          return HttpResponse.json({ server: [], client: [] });
        }),
      );

      renderSyncManager();

      // Wait for docUpdate handler to be registered
      await waitFor(() => {
        expect(hasSocketHandler('docUpdate')).toBe(true);
      });

      // Simulate socket connect first
      act(() => {
        const connectHandler = getSocketHandler('connect');
        connectHandler?.();
      });

      await waitFor(() => {
        expect(store.getState().sync.state).toBe(State.connected);
      });

      // Simulate docUpdate event
      await act(async () => {
        const docUpdateHandler = getSocketHandler('docUpdate');
        await docUpdateHandler?.([updatedDoc]);
      });

      // Verify bulkDocs was called to write the update
      expect(handle.bulkDocs).toHaveBeenCalled();
    });

    it('handles socket disconnect', async () => {
      server.use(
        http.post('/api/sync/begin', () => {
          return HttpResponse.json({ server: [], client: [] });
        }),
      );

      renderSyncManager();

      // Wait for socket connection handler to be registered
      await waitFor(() => {
        expect(hasSocketHandler('connect')).toBe(true);
      });

      act(() => {
        const connectHandler = getSocketHandler('connect');
        connectHandler?.();
      });

      await waitFor(() => {
        expect(store.getState().sync.state).toBe(State.connected);
      });

      // Simulate disconnect
      act(() => {
        const disconnectHandler = getSocketHandler('disconnect');
        disconnectHandler?.();
      });

      // State should be disconnected
      expect(store.getState().sync.state).toBe(State.disconnected);
    });
  });

  describe('guest user', () => {
    it('does not connect socket for guest users', async () => {
      // Reset mocks for this specific test
      mockSocket.on.mockReset();

      // Create a fresh store and set user as guest
      const guestStore = createStore();
      guestStore.dispatch(setUserAsGuest());

      render(withStore(guestStore, <SyncManager />));

      // Wait a bit to ensure no socket connections are attempted
      await new Promise((resolve) => setTimeout(resolve, 100));

      // For guest users, socket shouldn't register any event handlers
      // because initSocket returns early when isGuest is true
      expect(mockSocket.on).not.toHaveBeenCalled();
    });
  });
});
