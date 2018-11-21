import * as express from 'express';
import * as expressWinston from 'express-winston';
// import * as morgan from 'morgan';

import { Config } from './types';
import * as bodyParser from 'body-parser';

import { initializeSequelize } from './db';

import { BitbucketClient } from './bitbucket/BitbucketClient';
import { Logger } from './lib/Logger';
import { LandRequestQueue } from './lib/Queue';
import { Runner } from './lib/Runner';
import { routes } from './routes';
// import History from './History';

module.exports = async function atlaskid(config: Config) {
  await initializeSequelize();

  const server = express();

  const { usersAllowedToApprove, allowLandWhenAble } = config.prSettings;
  server.use(
    expressWinston.logger({
      meta: false,
      winstonInstance: Logger,
      colorize: process.env.NODE_ENV !== 'production',
    }),
  );
  server.use(bodyParser.json());
  // These are settings that we need passed into routes/ because they need to be passed to the front
  // end.
  // TODO: Find a nicer way to do this
  server.set('baseUrl', config.baseUrl);
  server.set('usersAllowedToMerge', usersAllowedToApprove);
  server.set('allowLandWhenAble', allowLandWhenAble);
  if (config.repoConfig.repoUuid) {
    server.set('repoUuid', config.repoConfig.repoUuid);
  }

  const client = new BitbucketClient(config);
  // let history = new History();

  const queue = new LandRequestQueue();
  const runner = new Runner(queue, client, config);

  try {
    routes(server, client, runner);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

  return server;
};
