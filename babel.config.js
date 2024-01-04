// This entirely exists for jest
module.exports = {
  presets: [
    '@babel/preset-typescript',
    '@babel/preset-env',
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
};
