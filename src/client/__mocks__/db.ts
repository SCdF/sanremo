const db = () => ({
  find: jest.fn(),
  get: jest.fn(),
  userPut: jest.fn(),
});

export default db;
