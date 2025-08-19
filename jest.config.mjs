import { TextDecoder, TextEncoder } from 'util';

export default {
  verbose: true,
  globals: {
    TextDecoder,
    TextEncoder,
  },
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
  moduleDirectories: ['node_modules', 'src'],
  // moduleNameMapper: {
  //   '\\.(css|less|scss)$': 'identity-obj-proxy',
  // },
  moduleNameMapper: {
    axios: 'axios/dist/node/axios.cjs',
    'react-markdown': 'react-markdown/react-markdown.min.js',
  },
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
  },
};
