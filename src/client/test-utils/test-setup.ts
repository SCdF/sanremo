import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock localStorage to ensure it works properly in all test environments
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
