import sync from './sync';
import { getDocs, getStubsForUser, putDocs } from './db';

jest.mock('./db');

const mockGetStubsForUser = getStubsForUser as jest.MockedFunction<typeof getStubsForUser>;

const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockPutDocs = putDocs as jest.MockedFunction<typeof putDocs>;

const user = { name: 'test', id: 1 };

describe('declare', () => {
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

    const result = await sync.declare(user, userDocs);

    expect(mockGetStubsForUser).toBeCalledTimes(1);
    expect(mockGetStubsForUser).lastCalledWith(user);
    expect(result).toEqual({
      server: [userDocNewerThanServerFromClient, newToServer],
      client: [newToClient, serverDocNewerThanUserFromServer],
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
