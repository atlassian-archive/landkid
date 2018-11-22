#!/usr/bin/env node

import * as connectRedis from 'connect-redis';
import * as express from 'express';
import * as expressSession from 'express-session';
import * as expressWinston from 'express-winston';
import * as passport from 'passport';
import * as session from 'express-session';

import * as bodyParser from 'body-parser';

import { initializeSequelize } from './db';

import { BitbucketClient } from './bitbucket/BitbucketClient';
import { config, hasConfig } from './lib/Config';
import { Logger } from './lib/Logger';
import { LandRequestQueue } from './lib/Queue';
import { Runner } from './lib/Runner';
import { routes } from './routes';
import { initializePassport } from './auth/bitbucket';
import { LandRequestHistory } from './lib/History';

const RedisStore = connectRedis(session);

async function main() {
  if (!hasConfig) {
    throw new Error(
      'Could not find config.js file, see the README for instructions',
    );
  }

  await initializeSequelize();
  initializePassport();

  const server = express();

  server.use(
    expressWinston.logger({
      meta: false,
      winstonInstance: Logger,
      colorize: process.env.NODE_ENV !== 'production',
    }),
  );
  server.use(bodyParser.json());
  server.use(
    expressSession({
      name: 'landkid.sid',
      secret: config.deployment.secret,
      saveUninitialized: true,
      store: new RedisStore({
        host: config.deployment.redis.endpoint,
        port: config.deployment.redis.port,
      }),
    }),
  );
  server.use(passport.initialize());
  server.use(passport.session());

  const client = new BitbucketClient(config);
  const queue = new LandRequestQueue();
  const history = new LandRequestHistory();
  const runner = new Runner(queue, history, client, config);

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
