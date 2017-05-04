var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: {
    // nameOfOutputFile: './path/to/file.js'
    test: './test/test.js'
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js'
  },
  resolve: {
    modules: [
      'node_modules',
      path.resolve(__dirname, 'lib'),
    ]
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development',
      DEBUG: true
    })
  ]
};
