const fs = require('fs');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const config = fs.existsSync('./config.js') ? require('./config') : null;

// This only really matters when building files, not in production
const outputPath = process.env.OUTPUT_PATH || '.';
const SERVER_PORT = process.env.SERVER_PORT || '8080';
const DEV_SERVER_PORT = process.env.DEV_SERVER_PORT || '3000';

module.exports = {
  entry: {
    bitbucket: path.resolve(__dirname, './src/static/bitbucket'),
    'current-state': path.resolve(__dirname, './src/static/current-state'),
  },
  output: {
    path: path.resolve(outputPath),
    publicPath: '/',
    filename: '[name]/bundle.[chunkhash].js',
  },
  mode: 'development',
  ignoreWarnings: [(warning) => true],
  devServer: {
    compress: true,
    historyApiFallback: true,
    // hot: true,
    port: Number(DEV_SERVER_PORT),
    proxy: {
      '/api': `http://localhost:${SERVER_PORT}`,
      '/auth': `http://localhost:${SERVER_PORT}`,
      '/bitbucket': `http://localhost:${SERVER_PORT}`,
      '/ac': `http://localhost:${SERVER_PORT}`,
    },
    client: {
      webSocketURL: config ? config.baseUrl.replace('https://', '') : undefined,
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.tsx?/,
        use: [
          {
            loader: require.resolve('cache-loader'),
            options: {
              cacheDirectory: path.resolve(__dirname, 'node_modules', '.build-cache', 'ts'),
            },
          },
          {
            loader: require.resolve('ts-loader'),
            options: {
              transpileOnly: true,
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.json', '.ts', '.tsx'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'bitbucket/index.html',
      // only inject the code from the 'bitbucket' entry/chunk
      chunks: ['bitbucket'],
      template: path.resolve(__dirname, './src/static/bitbucket/index.ejs'),
      templateParameters: {
        widgetSettings: JSON.stringify(config?.widgetSettings || {}),
      },
    }),
    new HtmlWebpackPlugin({
      filename: 'current-state/index.html',
      // only inject the code from the 'current-state' entry/chunk
      chunks: ['current-state'],
      template: path.resolve(__dirname, './src/static/current-state/index.html'),
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      // should't need any chunks for the home page
      chunks: [],
      template: path.resolve(__dirname, './src/static/index.html'),
    }),
  ],
};
