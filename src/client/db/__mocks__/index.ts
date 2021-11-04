const mockDb = {
  find: jest.fn(),
  get: jest.fn(),
  userPutDeleteMe: jest.fn(),
  put: jest.fn(),
};

const db = () => mockDb;

export default db;
