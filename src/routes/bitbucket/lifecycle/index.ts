import * as express from 'express';
import { authenticateProxyCall, wrap } from '../../middleware';
import { Installation } from '../../../db';

export function lifecycleRoutes() {
  const router = express();

  router.post(
    '/installed',
    wrap(async (req, res) => {
      const install = await Installation.findOne<Installation>();
      if (install) {
        return res.status(400).json({
          error: 'Already installed',
        });
      }

      if (
        !req.body.clientKey ||
        !req.body.sharedSecret ||
        req.body.productType !== 'bitbucket'
      ) {
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

      res.send('OK');
    }),
  );

  router.post(
    '/uninstalled',
    authenticateProxyCall,
    wrap(async (req, res) => {
      await Installation.destroy({
        where: {
          id: 'the-one-and-only',
        },
      });
      res.send('Bye');
    }),
  );

  return router;
}
