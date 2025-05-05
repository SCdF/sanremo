import { vi } from 'vitest';

const mockDb = {
  find: vi.fn(),
  get: vi.fn(),
  userPut: vi.fn(),
};

const db = () => mockDb;

export default db;
