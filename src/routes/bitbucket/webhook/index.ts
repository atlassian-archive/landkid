import * as express from 'express';

import { Runner } from '../../../Runner';
import { BitbucketClient } from '../../../bitbucket/BitbucketClient';
import { wrap } from '../../../middleware';

export function webhookRoutes(runner: Runner, client: BitbucketClient) {
  const router = express();

  router.post(
    '/status-updated',
    wrap(async (req, res) => {
      res.status(200).send({});
      // status event will be null if we don't care about it
      const statusEvent = client.processStatusWebhook(req.body);
      if (!statusEvent) return;
      runner.onStatusUpdate(statusEvent);
    }),
  );

  return router;
}
