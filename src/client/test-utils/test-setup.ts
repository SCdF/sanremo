import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock localStorage to ensure it works properly in all test environments
const localStorageMock = {
  getItem: vi.fn((key: string) => null),
  setItem: vi.fn((key: string, value: string) => {}),
  removeItem: vi.fn((key: string) => {}),
  clear: vi.fn(() => {}),
  get length() {
    return 0;
  },
  key: vi.fn((index: number) => null),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
