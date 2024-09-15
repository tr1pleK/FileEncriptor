const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve.fallback = {
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    assert: require.resolve('assert'),
    buffer: require.resolve('buffer'),
    vm: require.resolve('vm-browserify'),
    process: require.resolve('process/browser'),  // Добавляем полифил для process
  };

  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',  // Полифил process
    }),
  ]);

  return config;
};
