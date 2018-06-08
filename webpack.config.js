const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// This only really matters when building files, not in production
const outputPath = process.env.OUTPUT_PATH || '.';

module.exports = {
  entry: {
    bitbucket: path.resolve(__dirname, './src/static/bitbucket/index'),
    'current-state': path.resolve(
      __dirname,
      './src/static/current-state/index',
    ),
  },
  output: {
    path: path.resolve(outputPath),
    publicPath: '/',
    filename: '[name]/bundle.js',
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.js/,
        use: {
          loader: require.resolve('babel-loader'),
          query: { presets: [require.resolve('babel-preset-react')] },
        },
      },
    ],
  },
  resolve: {
    alias: {
      react: 'preact-compat',
      'react-dom': 'preact-compat',
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'bitbucket/index.html',
      // only inject the code from the 'bitbucket' entry/chunk
      chunks: ['bitbucket'],
      template: path.resolve(__dirname, './src/static/bitbucket/index.html'),
    }),
    new HtmlWebpackPlugin({
      filename: 'current-state/index.html',
      // only inject the code from the 'current-state' entry/chunk
      chunks: ['current-state'],
      template: path.resolve(
        __dirname,
        './src/static/current-state/index.html',
      ),
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      // should't need any chunks for the home page
      chunks: [],
      template: path.resolve(__dirname, './src/static/index.html'),
    }),
  ],
};
