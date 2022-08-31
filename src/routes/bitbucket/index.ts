import express from 'express';

import { BitbucketClient } from '../../bitbucket/BitbucketClient';
import { Runner } from '../../lib/Runner';
import { proxyRoutes } from './proxy';
import { webhookRoutes } from './webhook';
import { lifecycleRoutes } from './lifecycle';

export function bitbucketRoutes(runner: Runner, client: BitbucketClient) {
  const router = express();

  router.use('/lifecycle', lifecycleRoutes(runner));
  router.use('/proxy', proxyRoutes(runner, client));
  router.use('/webhook', webhookRoutes(runner, client));

  return router;
}
