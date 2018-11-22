import * as express from 'express';

import { wrap, requireAuth } from '../middleware';
import { Runner } from '../../lib/Runner';
import { Logger } from '../../lib/Logger';
import { BitbucketClient } from '../../bitbucket/BitbucketClient';
import { AccountService } from '../../lib/AccountService';

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
      Logger.info('Requesting current history');
      res.header('Access-Control-Allow-Origin', '*').json(history);
    }),
  );

  router.get(
    '/user/:aaid',
    requireAuth('read'),
    wrap(async (req, res) => {
      res.json(
        await AccountService.get(client).getAccountInfo(req.params.aaid),
      );
    }),
  );

  router.post(
    '/pause',
    requireAuth('admin'),
    wrap(async (req, res) => {
      let pausedReason = 'Paused via API';
      if (req && req.body && req.body.reason) {
        pausedReason = String(req.body.reason);
      }
      runner.pause(pausedReason, req.user!);
      res.json({ paused: true, pausedReason });
    }),
  );

  router.post(
    '/unpause',
    requireAuth('admin'),
    wrap(async (req, res) => {
      await runner.unpause(req.user!);
      res.json({ paused: false });
    }),
  );

  /**
   * This is a magic endpoint that allows us to call next() if landkid hangs
   */
  router.post(
    '/next',
    requireAuth('admin'),
    wrap(async (req, res) => {
      await runner.next();
      res.json({ message: 'Called next()' });
    }),
  );

  return router;
}
