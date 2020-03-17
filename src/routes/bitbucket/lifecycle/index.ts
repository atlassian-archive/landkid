import * as express from 'express';
import { authenticateIncomingBBCall, wrap } from '../../middleware';
import { Installation } from '../../../db';
import { Logger } from '../../../lib/Logger';
import { Runner } from '../../../lib/Runner';

export function lifecycleRoutes(runner: Runner) {
  const router = express();

  router.post(
    '/installed',
    wrap(async (req, res) => {
      Logger.verbose('Requesting creation of installation entry', {
        namespace: 'routes:bitbucket:lifecycle:installed',
      });
      const install = await Installation.findOne<Installation>();
      if (install) {
        Logger.error('Attempted to install over an existing installation', {
          namespace: 'routes:bitbucket:lifecyle:installed',
        });
        return res.status(400).json({
          error: 'Attempted to install over an existing installation',
        });
      }

      if (!req.body.clientKey || !req.body.sharedSecret || req.body.productType !== 'bitbucket') {
        return res.status(400).json({
          error: 'Invalid installation webhook',
        });
      }

      // TODO: Validate the clientKey and sharedSecret before persisting by
      // attempting to call a bitbucket API

      await Installation.create<Installation>({
        id: 'the-one-and-only',
        clientKey: req.body.clientKey,
        sharedSecret: req.body.sharedSecret,
      });
      Logger.info('Created installation entry', {
        namespace: 'routes:bitbucket:lifecycle:installed',
      });

      res.send('OK');
    }),
  );

  router.post(
    '/uninstalled',
    authenticateIncomingBBCall,
    wrap(async (req, res) => {
      await Installation.destroy({
        where: { id: 'the-one-and-only' },
      });

      const [queued, waiting] = await Promise.all([
        runner.queue.getQueue(),
        runner.queue.getStatusesForWaitingRequests(),
      ]);
      for (const status of [...queued, ...waiting]) {
        await status.request.setStatus('aborted', 'BitBucket Addon was Uninstalled...');
      }
      res.send('Bye');
    }),
  );

  return router;
}
