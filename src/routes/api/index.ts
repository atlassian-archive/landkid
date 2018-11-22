import * as express from 'express';

import { wrap, requireAuth } from '../middleware';
import { Runner } from '../../lib/Runner';
import { Logger } from '../../lib/Logger';
import { BitbucketClient } from '../../bitbucket/BitbucketClient';

export function apiRoutes(runner: Runner, client: BitbucketClient) {
  const router = express();

  router.get(
    '/current-state',
    requireAuth('read'),
    wrap(async (req, res) => {
      const state = await runner.getState();
      Logger.info('Requesting current state');
      res.header('Access-Control-Allow-Origin', '*').json(state);
    }),
  );

  router.get(
    '/history',
    requireAuth('read'),
    wrap(async (req, res) => {
      const history = await runner.getHistory();
      console.log(history);
      Logger.info('Requesting current history');
      res.header('Access-Control-Allow-Origin', '*').json(history);
    }),
  );

  router.post('/pause', requireAuth('admin'), (req, res) => {
    let pausedReason = 'Paused via API';
    if (req && req.body && req.body.reason) {
      pausedReason = String(req.body.reason);
    }
    runner.pause(pausedReason);
    res.json({ paused: true, pausedReason });
  });

  router.post('/unpause', requireAuth('admin'), (req, res) => {
    runner.unpause();
    res.json({ paused: false });
  });

  /**
   * This is a magic endpoint that allows us to call next() if landkid hangs
   */
  router.post('/next', requireAuth('admin'), (req, res) => {
    runner.next();
    res.json({ message: 'Calling next()' });
  });

  return router;
}
