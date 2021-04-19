import * as express from 'express';

import { wrap, requireAuth, requireCustomToken } from '../middleware';
import { Runner } from '../../lib/Runner';
import { Logger } from '../../lib/Logger';
import { BitbucketClient } from '../../bitbucket/BitbucketClient';
import { AccountService } from '../../lib/AccountService';
import { permissionService } from '../../lib/PermissionService';
import { Config, LandRequestOptions } from '../../types';
import { eventEmitter } from '../../lib/Events';

const landKidTag = process.env.LANDKID_TAG || 'Unknown';

export function apiRoutes(runner: Runner, client: BitbucketClient, config: Config) {
  const router = express();
  const easterEggText = config.easterEgg || 'There is no cow level';

  router.get(
    '/meta',
    wrap(async (req, res) => {
      Logger.verbose('Requesting meta information', { namespace: 'routes:api:meta' });
      const install = await runner.getInstallationIfExists();
      const isInstalled = !!install;
      const { customChecks, ...prSettings } = config.prSettings;
      res.header('Access-Control-Allow-Origin', '*').json({
        meta: {
          'tag-version': landKidTag,
          easterEgg: easterEggText,
          targetRepo: config.repoConfig.repoName,
          prSettings,
          maxConcurrentBuilds: runner.getMaxConcurrentBuilds(),
        },
        isInstalled,
      });
    }),
  );

  router.get(
    '/current-state',
    requireAuth('read'),
    wrap(async (req, res) => {
      try {
        Logger.info('Requesting current state', { namespace: 'routes:api:current-state' });
        const state = await runner.getState(req.user!);
        eventEmitter.emit('GET_STATE.SUCCESS');
        res.header('Access-Control-Allow-Origin', '*').json(state);
      } catch {
        Logger.error('Error getting current state', { namespace: 'routes:api:current-state' });
        eventEmitter.emit('GET_STATE.FAIL');
        res.sendStatus(500);
      }
    }),
  );

  router.get(
    '/history',
    requireAuth('land'),
    wrap(async (req, res) => {
      const page = parseInt((req.query.page as string) || '0', 10);
      const history = await runner.getHistory(page);
      Logger.info('Requesting history', { namespace: 'routes:api:history', page });
      res.header('Access-Control-Allow-Origin', '*').json(history);
    }),
  );

  router.get(
    '/user/:aaid',
    requireAuth('read'),
    wrap(async (req, res) => {
      const aaid = req.params.aaid;
      Logger.verbose('Requesting user', { namespace: 'routes:api:user', aaid });
      res.json(await AccountService.get(client).getAccountInfo(aaid));
    }),
  );

  router.patch(
    '/permission/:aaid',
    requireAuth('admin'),
    wrap(async (req, res) => {
      const aaid = req.params.aaid;
      const mode = req.body.mode;
      Logger.verbose('Setting user permission', { namespace: 'routes:api:permission', aaid, mode });
      if (['read', 'land', 'admin'].indexOf(mode) === -1) {
        return res.status(400).json({ error: 'Invalid permission mode' });
      }
      res.json(await permissionService.setPermissionForUser(aaid, mode, req.user!));
    }),
  );

  router.patch(
    '/note/:aaid',
    requireAuth('admin'),
    wrap(async (req, res) => {
      const aaid = req.params.aaid;
      const note = req.body.note;
      Logger.verbose('Setting user note', { namespace: 'routes:api:note', aaid, note });
      if (!note) {
        return res.status(400).json({ error: 'Note can not be empty' });
      }
      await permissionService.setNoteForUser(aaid, note, req.user!);
      res.json({ message: `Added note to user ${aaid}` });
    }),
  );

  router.delete(
    '/note/:aaid',
    requireAuth('admin'),
    wrap(async (req, res) => {
      const aaid = req.params.aaid;
      Logger.verbose('Removing user note', { namespace: 'routes:api:note', aaid });
      await permissionService.removeUserNote(aaid);
      res.json({ message: `Removed note from user ${aaid}` });
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
      Logger.verbose('Pausing', { namespace: 'routes:api:pause', pausedReason });
      runner.pause(pausedReason, req.user!);
      res.json({ paused: true, pausedReason });
    }),
  );

  router.post(
    '/unpause',
    requireAuth('admin'),
    wrap(async (req, res) => {
      Logger.verbose('Unpausing', { namespace: 'routes:api:unpause' });
      await runner.unpause();
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
      Logger.verbose('Calling next', { namespace: 'routes:api:next' });
      await runner.next();
      res.json({ message: 'Called next()' });
    }),
  );

  router.post(
    '/uninstall',
    requireAuth('admin'),
    wrap(async (req, res) => {
      Logger.verbose('Uninstalling', { namespace: 'routes:api:uninstall' });
      await runner.deleteInstallation();
      res.json({ message: 'Installation deleted' });
    }),
  );

  router.post(
    '/remove/:id',
    requireAuth('admin'),
    wrap(async (req, res) => {
      const requestId = req.params.id;
      Logger.verbose('Removing landrequest from queue', {
        namespace: 'routes:api:remove',
        requestId,
      });
      const success = await runner.removeLandRequestFromQueue(requestId, req.user!);
      if (success) {
        res.json({ message: 'Request removed from queue' });
      } else {
        res.status(400).json({ error: 'Request either does not exist or is not queued' });
      }
    }),
  );

  router.post(
    '/cancel/:id',
    requireAuth('admin'),
    wrap(async (req, res) => {
      const requestId = req.params.id;
      Logger.verbose('Cancelling running landrequest', {
        namespace: 'routes:api:cancel',
        requestId,
      });
      const success = await runner.cancelRunningBuild(requestId, req.user!);
      if (success) {
        res.json({ message: 'Running build cancelled' });
      } else {
        res.status(400).json({ error: 'Request either does not exist or is not running' });
      }
    }),
  );

  router.post(
    '/message',
    requireAuth('admin'),
    wrap(async (req, res) => {
      let message = '';
      let type = '';
      if (req && req.body && req.body.message && req.body.type) {
        message = String(req.body.message);
        type = String(req.body.type);
      }
      Logger.verbose('Setting message', { namespace: 'routes:api:message', message, type });
      if (!message) {
        return res.status(400).json({ error: 'Cannot send an empty message' });
      }
      if (!['default', 'warning', 'error'].includes(type)) {
        return res
          .status(400)
          .json({ error: 'Message type must be one of: default, warning, error' });
      }
      // @ts-ignore -- checks value of type above
      runner.addBannerMessage(message, type, req.user!);
      res.json({ message });
    }),
  );

  router.post(
    '/remove-message',
    requireAuth('admin'),
    wrap(async (req, res) => {
      Logger.verbose('Removing message', { namespace: 'routes:api:remove-message' });
      await runner.removeBannerMessage();
      res.json({ removed: true });
    }),
  );

  router.get(
    '/landrequests',
    requireAuth('land'),
    wrap(async (req, res) => {
      const ids = (req.query.ids as string).split(',');
      Logger.verbose('Requesting landrequests', { namespace: 'routes:api:landrequests', ids });
      res.json({ statuses: await runner.getStatusesForLandRequests(ids) });
    }),
  );

  router.post(
    '/create-landrequest',
    requireCustomToken,
    wrap(async (req, res) => {
      if (!req.body || !req.body.prId) {
        return res.status(400).json({ err: 'req.body.prId expected' });
      }

      const prId = parseInt(req.body.prId, 10);
      const prInfo = await client.bitbucket.getPullRequest(prId);

      if (!prInfo) {
        return res.status(400).json({ err: 'Could not find PR with that ID' });
      }

      const landRequest: LandRequestOptions = {
        prId,
        // Must always have a valid aaid, so lets set it to Luke's aaid
        triggererAaid: req.user ? req.user.aaid : '557057:9512f4e4-3319-4d30-a78d-7d5f8ed243ae',
        commit: prInfo.commit,
        prTitle: prInfo.title,
        prAuthorAaid: prInfo.authorAaid,
        prSourceBranch: prInfo.sourceBranch,
        prTargetBranch: prInfo.targetBranch,
      };

      if (req.body.entryPoint === 'land-when-able') {
        await runner.addToWaitingToLand(landRequest);
      } else {
        await runner.enqueue(landRequest);
      }
      Logger.info('Landrequest created', { landRequest });

      res.sendStatus(200);
    }),
  );

  router.delete(
    '/delete-history',
    requireAuth('admin'),
    wrap(async (req, res) => {
      Logger.verbose('Deleting history', { namespace: 'routes:api:delete-history' });
      await runner.clearHistory();
      res.json({ response: 'You better be sure about this captain... Done!' });
    }),
  );

  router.delete(
    '/clear-land-when-able-queue',
    requireAuth('admin'),
    wrap(async (req, res) => {
      Logger.verbose('Deleting land-when-able queue', {
        namespace: 'routes:api:clear-land-when-able-queue',
      });
      await runner.clearLandWhenAbleQueue();
      res.json({
        response: 'You may not be a threat, but you better stop pretending to be a hero... Done!',
      });
    }),
  );

  router.post(
    '/to-the-top/:id',
    requireAuth('admin'),
    wrap(async (req, res) => {
      const requestId = req.params.id;
      Logger.verbose('Moving landrequest to the top of the queue', {
        namespace: 'routes:api:to-the-top',
        requestId,
      });
      const success = await runner.moveRequestToTopOfQueue(requestId, req.user!);
      if (success) {
        res.json({ message: 'Request moved to top of queue' });
      } else {
        res.status(400).json({ error: 'Request either does not exist or is not queued' });
      }
    }),
  );

  return router;
}
