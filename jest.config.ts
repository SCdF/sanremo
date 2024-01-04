import { TextDecoder, TextEncoder } from 'util';

module.exports = {
  globals: {
    TextDecoder,
    TextEncoder,
  },
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
};
