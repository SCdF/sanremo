import { MockedFunction, describe, expect, it, vi } from 'vitest';
import { getDocs, getStubsForUser, putDocs } from './db';
import sync from './sync';

vi.mock('./db');

const mockGetStubsForUser = getStubsForUser as MockedFunction<typeof getStubsForUser>;

const mockGetDocs = getDocs as MockedFunction<typeof getDocs>;
const mockPutDocs = putDocs as MockedFunction<typeof putDocs>;

const user = { name: 'test', id: 1 };

describe('begin', () => {
  it('works correctly', async () => {
    const newToServer = { _id: 'doc new to server', _rev: '1-abc' };
    const newToClient = { _id: 'doc new to client', _rev: '1-abc' };
    const userAndServerTheSame = {
      _id: 'user and server doc the same',
      _rev: '1-abc',
    };

    const userDocNewerThanServerFromClient = {
      _id: 'user doc newer than server',
      _rev: '10-abc',
    };
    const serverDocNewerThanUserFromClient = {
      _id: 'server doc newer than user',
      _rev: '1-abc',
    };
    const userDocs = [
      newToServer,
      userDocNewerThanServerFromClient,
      serverDocNewerThanUserFromClient,
      userAndServerTheSame,
      // TODO: conflicts
    ];

    const userDocNewerThanServerFromServer = {
      _id: 'user doc newer than server',
      _rev: '1-abc',
    };
    const serverDocNewerThanUserFromServer = {
      _id: 'server doc newer than user',
      _rev: '10-abc',
    };
    const serverDocs = [
      newToClient,
      userDocNewerThanServerFromServer,
      serverDocNewerThanUserFromServer,
      userAndServerTheSame,
      // TODO: conflicts
    ];

    mockGetStubsForUser.mockResolvedValue(serverDocs);

    const result = await sync.begin(user, userDocs);

    expect(mockGetStubsForUser).toBeCalledTimes(1);
    expect(mockGetStubsForUser).lastCalledWith(user);
    expect(result).toEqual({
      server: [userDocNewerThanServerFromClient, newToServer],
      client: [newToClient, serverDocNewerThanUserFromServer],
    });
  });

  describe('deletes', () => {
    it('writes deletes for new documents', async () => {
      const clientDocs = [{ _id: 'to be deleted', _rev: '1-abc', _deleted: true }];
      mockGetStubsForUser.mockResolvedValue([]);

      const results = await sync.begin(user, clientDocs);

      expect(results.client.length).toBe(0);
      expect(results.server.length).toBe(0);
      expect(mockPutDocs).toBeCalledTimes(1);
      expect(mockPutDocs).toBeCalledWith(user, clientDocs);
    });
    it('writes deletes over existing documents', async () => {
      const clientDocs = [{ _id: 'to be deleted', _rev: '2-abc', _deleted: true }];
      const serverDocs = [{ _id: 'to be deleted', _rev: '1-abc' }];
      mockGetStubsForUser.mockResolvedValue(serverDocs);

      const results = await sync.begin(user, clientDocs);

      expect(results.client.length).toBe(0);
      expect(results.server.length).toBe(0);
      expect(mockPutDocs).toBeCalledTimes(1);
      expect(mockPutDocs).toBeCalledWith(user, clientDocs);
    });
    it('ignores client writes if a delete exists on the server, return that delete', async () => {
      const clientDocs = [{ _id: 'to be deleted', _rev: '2-abc' }];
      const serverDocs = [{ _id: 'to be deleted', _rev: '1-abc', _deleted: true }];
      mockGetStubsForUser.mockResolvedValue(serverDocs);

      const results = await sync.begin(user, clientDocs);

      expect(results.client.length).toBe(1);
      expect(results.client).toEqual(serverDocs);
      expect(results.server.length).toBe(0);
    });
  });
});

describe('request', () => {
  it('works correctly', async () => {
    const clientStubs = [
      { _id: '123', _rev: '1-123' },
      { _id: '456', _rev: '1-456' },
    ];
    const serverDocs = [
      { _id: '123', _rev: '1-123', more: 'data' },
      { _id: '456', _rev: '1-456', more: 'data' },
    ];
    mockGetDocs.mockResolvedValue(serverDocs);
    const result = await sync.request(user, clientStubs);
    expect(mockGetDocs).toBeCalledTimes(1);
    expect(mockGetDocs).lastCalledWith(user, ['123', '456']);
    expect(result).toEqual(serverDocs);
  });
});

describe('update', () => {
  it('works correctly', async () => {
    const clientDocs = [
      { _id: '123', _rev: '1-123' },
      { _id: '456', _rev: '1-456' },
    ];

    await sync.update(user, clientDocs);
    expect(mockPutDocs).toBeCalledTimes(1);
    expect(mockPutDocs).lastCalledWith(user, clientDocs);
  });
});
