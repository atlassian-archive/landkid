import * as express from 'express';

import { BitbucketClient } from '../../bitbucket/BitbucketClient';
import { Runner } from '../../Runner';
import { authenticateProxyCall } from '../../middleware';
import { proxyRoutes } from './proxy';
import { webhookRoutes } from './webhook';
import { lifecycleRoutes } from './lifecycle';

export function bitbucketRoutes(runner: Runner, client: BitbucketClient) {
  const router = express();

  router.use('/lifecycle', lifecycleRoutes());
  router.use('/proxy', authenticateProxyCall, proxyRoutes());
  router.use('/webhook', authenticateProxyCall, webhookRoutes(runner, client));

  return router;
}
