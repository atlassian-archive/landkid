#!/usr/bin/env node

import * as express from 'express';
import * as expressWinston from 'express-winston';
// import * as morgan from 'morgan';

import * as bodyParser from 'body-parser';

import { initializeSequelize } from './db';

import { BitbucketClient } from './bitbucket/BitbucketClient';
import { config, hasConfig } from './lib/Config';
import { Logger } from './lib/Logger';
import { LandRequestQueue } from './lib/Queue';
import { Runner } from './lib/Runner';
import { routes } from './routes';
// import History from './History';

async function main() {
  if (!hasConfig) {
    throw new Error(
      'Could not find config.js file, see the README for instructions',
    );
  }

  await initializeSequelize();

  const server = express();

  server.use(
    expressWinston.logger({
      meta: false,
      winstonInstance: Logger,
      colorize: process.env.NODE_ENV !== 'production',
    }),
  );
  server.use(bodyParser.json());

  const client = new BitbucketClient(config);
  // let history = new History();

  const queue = new LandRequestQueue();
  const runner = new Runner(queue, client, config);

  routes(server, client, runner);

  server.listen(config.port, () => {
    Logger.info('LandKid is running', { port: config.port });
  });
}

if (process.mainModule === module) {
  main().catch(err => {
    Logger.error('Fatal error occurred in main()', {
      err: { message: err.message, stack: err.stack },
    });
  });
}
