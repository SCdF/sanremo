import { type Mock, vi } from 'vitest';
import type { Doc } from '../../../shared/types';

export interface MockDatabase {
  find: Mock<(options?: unknown) => Promise<{ docs: unknown[] }>>;
  get: Mock<(docId: string) => Promise<unknown>>;
  userPut: Mock<(doc: Doc) => Promise<Doc>>;
}

const mockDb: MockDatabase = {
  find: vi.fn(),
  get: vi.fn(),
  userPut: vi.fn(),
};

/**
 * Get the mock database handle. Use this in tests after vi.mock('../db').
 * Returns the same mock instance regardless of the user argument.
 */
export function getMockDb(): MockDatabase {
  return mockDb;
}

const db = () => mockDb;

export default db;
