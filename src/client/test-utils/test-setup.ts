import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './msw-server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => server.resetHandlers());

afterAll(() => server.close());

const localStorageMock = {
  getItem: vi.fn((_key: string) => null),
  setItem: vi.fn((_key: string, _value: string) => {}),
  removeItem: vi.fn((_key: string) => {}),
  clear: vi.fn(() => {}),
  get length() {
    return 0;
  },
  key: vi.fn((_index: number) => null),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
