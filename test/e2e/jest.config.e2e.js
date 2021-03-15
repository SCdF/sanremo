module.exports = {
  preset: 'jest-playwright-preset',
  testEnvironmentOptions: {
    'jest-playwright': {
      launchOptions: {
      //   headless: false,
      //   slowMo: 5000
      }
    }
  },
  testMatch: ['**/test/e2e/**/*.spec.js'],
  transform: {
    "\\.js$": "react-scripts/config/jest/babelTransform"
  },
  verbose: true
};
