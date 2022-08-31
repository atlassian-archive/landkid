#!/usr/bin/env node

import redis from 'redis';
import connectRedis from 'connect-redis';
import express from 'express';
import expressSession from 'express-session';
import expressWinston from 'express-winston';
import passport from 'passport';
import bodyParser from 'body-parser';

import { initializeSequelize, MigrationService } from './db';
import { BitbucketClient } from './bitbucket/BitbucketClient';
import { config, hasConfig } from './lib/Config';
import { LandRequestQueue } from './lib/Queue';
import { Runner } from './lib/Runner';
import { routes } from './routes';
import { initializePassport } from './auth/bitbucket';
import { LandRequestHistory } from './lib/History';
import { Logger } from './lib/Logger';
import { initializeEventListeners, eventEmitter } from './lib/Events';

const RedisStore = connectRedis(expressSession);

async function main() {
  if (!hasConfig) {
    throw new Error('Could not find config.js file, see the README for instructions');
  }

  const sequelize = await initializeSequelize();
  const migrator = new MigrationService(sequelize);
  await migrator.up();

  initializePassport(config.deployment.oAuth);

  const server = express();

  const redisClient = redis.createClient({
    host: config.deployment.redis.endpoint,
    port: config.deployment.redis.port,
  });

  server.use(
    expressWinston.logger({
      meta: false,
      winstonInstance: Logger,
      colorize: process.env.NODE_ENV !== 'production',
      level: 'http',
    }),
  );
  server.use(bodyParser.json());
  server.use(
    expressSession({
      name: 'landkid.sid',
      secret: config.deployment.secret,
      saveUninitialized: true,
      store: new RedisStore({
        client: redisClient,
      }),
    }),
  );
  server.use(passport.initialize());
  server.use(passport.session());

  const client = new BitbucketClient(config);
  const queue = new LandRequestQueue();
  const history = new LandRequestHistory();
  const runner = new Runner(queue, history, client, config);

  initializeEventListeners();

  await routes(server, client, runner);

  eventEmitter.emit('STARTUP');
  // TODO: lookup all admins in user service to add them to the redis cache

  server.listen(config.port, () => {
    Logger.info('LandKid is running', { port: config.port });

    // In case there were things still in the queue when we start up
    runner.next();
  });
}

if (process.mainModule === module) {
  main().catch((err) => {
    Logger.error('Fatal error occurred in main()', {
      err: { message: err.message, stack: err.stack },
      maybeResponse: err.response,
    });
  });
}
