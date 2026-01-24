import { type Mock, vi } from 'vitest';
import type { Doc } from '../../../shared/types';

export interface MockDatabase {
  allDocs: Mock<
    (options?: unknown) => Promise<{ rows: unknown[]; total_rows: number; offset: number }>
  >;
  find: Mock<(options?: unknown) => Promise<{ docs: unknown[] }>>;
  get: Mock<(docId: string) => Promise<unknown>>;
  userPut: Mock<(doc: Doc) => Promise<Doc>>;
  info: Mock<() => Promise<Record<string, unknown>>>;
  changes: Mock<(options?: unknown) => Promise<{ results: unknown[] }>>;
  allDocs: Mock<(options?: unknown) => Promise<{ rows: unknown[] }>>;
  bulkDocs: Mock<(docs: Doc[], options?: unknown) => Promise<unknown[]>>;
}

const mockDb: MockDatabase = {
  allDocs: vi.fn(),
  find: vi.fn(),
  get: vi.fn(),
  userPut: vi.fn(),
  info: vi.fn(),
  changes: vi.fn(),
  allDocs: vi.fn(),
  bulkDocs: vi.fn(),
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
