import { TextDecoder, TextEncoder } from 'util';

module.exports = {
  globals: {
    TextDecoder: TextDecoder,
    TextEncoder: TextEncoder,
  },
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
};
