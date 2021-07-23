import sync from './sync';
import { matchStubsToUser } from './db';

jest.mock('./db');

const mockMatchStubsToUser = matchStubsToUser as jest.MockedFunction<
  typeof matchStubsToUser
>;

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

    mockMatchStubsToUser.mockResolvedValue(serverDocs);

    const result = await sync.declare({ name: 'test', id: 1 }, userDocs);

    expect(mockMatchStubsToUser).toBeCalledTimes(1);
    expect(result).toEqual({
      server: [userDocNewerThanServerFromClient, newToServer],
      client: [newToClient, serverDocNewerThanUserFromServer],
    });
  });
});
