import * as express from 'express';

import { wrap, requireAuth } from '../middleware';
import { Runner } from '../../lib/Runner';
import { Logger } from '../../lib/Logger';
import { BitbucketClient } from '../../bitbucket/BitbucketClient';
import { AccountService } from '../../lib/AccountService';
import { permissionService } from '../../lib/PermissionService';
import { Config } from '../../types';

const landKidTag = process.env['LANDKID_TAG'] || 'Unknown';

export function apiRoutes(runner: Runner, client: BitbucketClient, config: Config) {
  const router = express();
  const easterEggText = config.easterEgg || 'There is no cow level';

  router.get(
    '/meta',
    wrap(async (req, res) => {
      const install = await runner.getInstallationIfExists();
      const isInstalled = !!install;
      res
        .header('Access-Control-Allow-Origin', '*')
        .json({ meta: { 'tag-version': landKidTag, easterEgg: easterEggText }, isInstalled });
    }),
  );

  router.get(
    '/current-state',
    requireAuth('read'),
    wrap(async (req, res) => {
      const state = await runner.getState(req.user!);
      Logger.info('Requesting current state');
      res.header('Access-Control-Allow-Origin', '*').json(state);
    }),
  );

  router.get(
    '/history',
    requireAuth('read'),
    wrap(async (req, res) => {
      const page = parseInt(req.query.page || '0', 10);
      const history = await runner.getHistory(page);
      Logger.info('Requesting current history');
      res.header('Access-Control-Allow-Origin', '*').json(history);
    }),
  );

  router.get(
    '/user/:aaid',
    requireAuth('read'),
    wrap(async (req, res) => {
      res.json(await AccountService.get(client).getAccountInfo(req.params.aaid));
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

  router.patch(
    '/permission/:aaid',
    requireAuth('admin'),
    wrap(async (req, res) => {
      const userAaid = req.params.aaid;
      const mode = req.body.mode;
      if (['read', 'land', 'admin'].indexOf(mode) === -1) {
        return res.status(400).json({ error: 'Invalid permission mode' });
      }
      res.json(await permissionService.setPermissionForUser(userAaid, mode, req.user!));
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

  router.post(
    '/cancel-current',
    requireAuth('admin'),
    wrap(async (req, res) => {
      await runner.cancelCurrentlyRunningBuild(req.user!);
      res.json({ cancelled: true });
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

  router.post(
    '/uninstall',
    requireAuth('admin'),
    wrap(async (req, res) => {
      await runner.deleteInstallation();
      res.json({ message: 'Installation deleted' });
    }),
  );

  router.post(
    '/remove/:id',
    requireAuth('admin'),
    wrap(async (req, res) => {
      const requestID = req.params.id;
      const success = await runner.removeLandRequestFromQueue(requestID, req.user!);
      if (success) {
        res.json({ message: 'Request removed from queue' });
      } else {
        res.status(400).json({ error: 'Request either does not exist or is not queued' });
      }
    }),
  );

  return router;
}
