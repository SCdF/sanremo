// import { mocked } from 'ts-jest/utils';
import { Client } from 'pg';

import sync from './sync';

jest.mock('pg');

const MockClient = Client as unknown as jest.Mock<typeof Client>;

describe('declare', () => {
  it('works correctly', async () => {
    const mockClient: Client = new MockClient();

    const userDocs = [
      { _id: 'doc new to server', _rev: '1-abc' },
      { _id: 'user doc newer than server', _rev: '10-abc' },
      { _id: 'server doc newer than user', _rev: '1-abc' },
      { _id: 'user and server doc the same', _rev: '1-abc' },
      // TODO: conflicts
    ];
    const serverDocs = [
      { _id: 'doc new to client', _rev: '1-abc' },
      { _id: 'user doc newer than server', _rev: '1-abc' },
      { _id: 'server doc newer than user', _rev: '10-abc' },
      { _id: 'user and server doc the same', _rev: '1-abc' },
      // TODO: conflicts
    ];

    mockClient.query;

    const result = await sync.declare(
      mockClient,
      { name: 'test', id: 1 },
      userDocs
    );
  });
});
