const mockDb = {
  find: jest.fn(),
  get: jest.fn(),
  userPut: jest.fn(),
};

const db = () => mockDb;

export default db;
