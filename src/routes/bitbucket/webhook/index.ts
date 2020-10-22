import * as express from 'express';

import { Runner } from '../../../lib/Runner';
import { BitbucketClient } from '../../../bitbucket/BitbucketClient';
import { wrap, authenticateIncomingBBCall } from '../../middleware';
import { Logger } from '../../../lib/Logger';

export function webhookRoutes(runner: Runner, client: BitbucketClient) {
  const router = express();

  router.use(authenticateIncomingBBCall);

  router.post(
    '/status-updated',
    wrap(async (req, res) => {
      res.sendStatus(200);
      Logger.info('Received status update webhook', {
        body: req.body,
        namespace: 'status-debugging',
      });
      // status event will be null if we don't care about it
      const statusEvent = client.processStatusWebhook(req.body);
      if (!statusEvent) return;
      runner.onStatusUpdate(statusEvent);
    }),
  );

  return router;
}
