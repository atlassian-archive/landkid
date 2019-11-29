import * as express from 'express';
import * as path from 'path';

import { config } from '../lib/Config';
import { Runner } from '../lib/Runner';
import { BitbucketClient } from '../bitbucket/BitbucketClient';
import { Logger } from '../lib/Logger';
import { apiRoutes } from './api';
import { bitbucketRoutes } from './bitbucket';
import { makeDescriptor } from '../bitbucket/descriptor';
import { authRoutes } from './auth';

export async function routes(server: express.Application, client: BitbucketClient, runner: Runner) {
  const router = express();

  let repoUuid = config.repoConfig.uuid;
  if (!repoUuid) {
    Logger.info('==== Fetching repository uuid from Bitbucket ====');
    Logger.info('You can skip this step by putting uuid config.repoConfig');
    repoUuid = await client.getRepoUuid();
  }

  const bitbucketAddonDescriptor = makeDescriptor(config, repoUuid);

  router.get('/healthcheck', (req, res) => {
    res.sendStatus(200);
  });

  router.get('/ac', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*').json(bitbucketAddonDescriptor);
  });
  router.use('/api', apiRoutes(runner, client, config));
  router.use('/auth', authRoutes());
  router.use('/bitbucket', bitbucketRoutes(runner, client));

  if (process.env.NODE_ENV === 'production') {
    router.use(express.static(path.join(__dirname, '..', 'static')));
  }

  router.use(((err, _, res, next) => {
    if (err) {
      Logger.error('Unhandled Express Error', { err });
      res.status(500).send({
        error: err.message,
        stack: err.stack,
      });
    } else {
      next();
    }
  }) as express.ErrorRequestHandler);

  server.use(router);
}
