// @flow
import express from 'express';
import morgan from 'morgan';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';

import hosts from './hosts';
import cis from './ci';
import personas from './personas';
import type { Env, Settings } from './types';
import bodyParser from 'body-parser';

import Queue from './Queue';
import Runner from './Runner';
import routes from './routes';
import Client from './Client';
import Logger from './Logger';

type Config = {
  port?: number,
  host: $Keys<typeof hosts>,
  hostConfig: Object,
  ci: $Keys<typeof cis>,
  ciConfig: {},
  persona?: $Keys<typeof personas>,
  baseUrl: string,
  settings: Settings
};

export default function atlaskid(config: Config, webpackConfig: any) {
  let server = express();
  let port = config.port || 8000;
  // If we are in dev mode we'll use the webpack dev server, if not we'll be using the built static
  // files in dist/[legacy|modern]/static. Routing for this is in ./routes.js
  if (process.env.NODE_ENV !== 'production') {
    const webpackCompiler = webpack(webpackConfig);

    server.use(
      webpackDevMiddleware(webpackCompiler, {
        publicPath: webpackConfig.output.publicPath,
        stats: {
          colors: true
        }
      })
    );
  }
  server.use(bodyParser.json());
  server.set('baseUrl', config.baseUrl);
  server.set(
    'usersAllowedToMerge',
    config.hostConfig.usersAllowedToApprove || []
  );

  const host = hosts[config.host](config.hostConfig);
  const ci = cis[config.ci](config.ciConfig);
  const persona = personas[config.persona || 'goat'];
  let client = new Client(host, ci, persona, config.settings);

  let queue = new Queue();
  let runner = new Runner(queue, client);

  routes(server, client, runner);

  return server;
}
