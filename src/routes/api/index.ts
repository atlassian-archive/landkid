import express from 'express';

import { wrap, requireAuth, requireCustomToken } from '../middleware';
import { Runner } from '../../lib/Runner';
import { Logger } from '../../lib/Logger';
import { BitbucketClient } from '../../bitbucket/BitbucketClient';
import { AccountService } from '../../lib/AccountService';
import { permissionService } from '../../lib/PermissionService';
import { Config, LandRequestOptions } from '../../types';
import { eventEmitter } from '../../lib/Events';
import { LandRequest } from '../../db';
import { StateService } from '../../lib/StateService';

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
          maxConcurrentBuilds: await StateService.getMaxConcurrentBuilds(),
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
        const state = await runner.getState(req.user!.aaid);
        eventEmitter.emit('GET_STATE.SUCCESS');
        res.header('Access-Control-Allow-Origin', '*').json(state);
      } catch (e) {
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
      StateService.pause(pausedReason, req.user!);
      res.json({ paused: true, pausedReason });
    }),
  );

  router.post(
    '/unpause',
    requireAuth('admin'),
    wrap(async (req, res) => {
      Logger.verbose('Unpausing', { namespace: 'routes:api:unpause' });
      await StateService.unpause();
      res.json({ paused: false });
    }),
  );

  router.post(
    '/update-concurrent-builds',
    requireAuth('admin'),
    wrap(async (req, res) => {
      const maxConcurrentBuilds = req?.body?.maxConcurrentBuilds;
      Logger.verbose(`Updating concurrent builds to ${maxConcurrentBuilds}`, {
        namespace: 'routes:api:update-concurrent-builds',
      });

      if (typeof maxConcurrentBuilds == 'number' && maxConcurrentBuilds > 0) {
        const success = await StateService.updateMaxConcurrentBuild(maxConcurrentBuilds, req.user!);
        if (success) {
          return res.status(200).json({ success: true });
        } else {
          return res.sendStatus(500);
        }
      }

      return res
        .status(400)
        .json({ err: 'req.body.maxConcurrentBuilds should be positive number' });
    }),
  );

  router.post(
    '/update-admin-settings',
    requireAuth('admin'),
    wrap(async (req, res) => {
      const mergeBlockingEnabled = req?.body?.mergeBlockingEnabled;
      const speculationEngineEnabled = req?.body?.speculationEngineEnabled;
      Logger.verbose(
        `Updating mergeBlockingEnabled to ${mergeBlockingEnabled} and speculationEngineEnabled to ${speculationEngineEnabled}`,
        {
          namespace: 'routes:api:update-admin-settings',
        },
      );

      if (
        typeof mergeBlockingEnabled == 'boolean' &&
        typeof speculationEngineEnabled == 'boolean'
      ) {
        const success = await StateService.updateAdminSettings(
          { mergeBlockingEnabled, speculationEngineEnabled },
          req.user!,
        );
        if (success) {
          return res.status(200).json({ success: true });
        } else {
          return res.sendStatus(500);
        }
      }

      return res.status(400).json({
        err: 'req.body.mergeBlockingEnabled and req.body.speculationEngineEnabled should be boolean',
      });
    }),
  );

  //endpoints for managing priority branch list
  router.post(
    '/add-priority-branch',
    requireAuth('admin'),
    wrap(async (req, res) => {
      const branchName = req?.body?.branchName;
      if (!branchName) {
        return res.status(400).json({ err: 'Missing branch name' });
      }
      Logger.verbose(`Adding priority branch ${branchName}`, {
        namespace: 'routes:api:add-priority-branch',
      });
      const success = await StateService.addPriorityBranch(branchName, req.user!);
      if (success) {
        res.status(200).json({ message: `${branchName} successfully added.` });
      } else {
        res.sendStatus(500);
      }
    }),
  );

  router.post(
    '/remove-priority-branch',
    requireAuth('admin'),
    wrap(async (req, res) => {
      const branchName = req?.body?.branchName;
      if (!branchName) {
        return res.status(400).json({ err: 'Missing branch name' });
      }
      Logger.verbose(`Removing priority branch ${branchName}`, {
        namespace: 'routes:api:remove-priority-branch',
      });
      const success = await StateService.removePriorityBranch(branchName);
      if (success) {
        res.status(200).json({ message: `${branchName} successfully removed.` });
      } else {
        res.sendStatus(500);
      }
    }),
  );

  router.post(
    '/update-priority-branch',
    requireAuth('admin'),
    wrap(async (req, res) => {
      const branchName = req?.body?.branchName;
      const id = req?.body?.id;
      if (!branchName) {
        return res.status(400).json({ err: 'Missing branch name' });
      }
      if (!id) {
        return res.status(400).json({ err: 'Missing id' });
      }
      Logger.verbose(`updating priority branch ${branchName}`, {
        namespace: 'routes:api:update-priority-branch',
      });

      const success = await StateService.updatePriorityBranch(id, branchName);
      if (success) {
        res.status(200).json({ message: `${branchName} successfully updated.` });
      } else {
        res.sendStatus(500);
      }
    }),
  );

  router.post(
    '/remove-all-priority-branches',
    requireAuth('admin'),
    wrap(async (req, res) => {
      Logger.verbose(`Removing all priority branches`, {
        namespace: 'routes:api:remove-all-priority-branches',
      });
      const success = await StateService.removeAllPriorityBranches();
      if (success) {
        res.status(200).json({ message: `All branches successfully removed.` });
      } else {
        res.sendStatus(500);
      }
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
      StateService.addBannerMessage(message, type, req.user!);
      res.json({ message });
    }),
  );

  router.post(
    '/remove-message',
    requireAuth('admin'),
    wrap(async (req, res) => {
      Logger.verbose('Removing message', { namespace: 'routes:api:remove-message' });
      await StateService.removeBannerMessage();
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

      const landRequestOptions: LandRequestOptions = {
        prId,
        // Must always have a valid aaid, so lets set it to Luke's aaid
        triggererAaid: req.user ? req.user.aaid : '557057:9512f4e4-3319-4d30-a78d-7d5f8ed243ae',
        triggererAccountId: req.user
          ? req.user.accountId
          : '557057:9512f4e4-3319-4d30-a78d-7d5f8ed243ae',
        commit: prInfo.commit,
        prTitle: prInfo.title,
        prAuthorAaid: prInfo.authorAaid,
        prAuthorAccountId: prInfo.author,
        prSourceBranch: prInfo.sourceBranch,
        prTargetBranch: prInfo.targetBranch,
      };

      let request: LandRequest | undefined;
      if (req.body.entryPoint === 'land-when-able') {
        request = await runner.addToWaitingToLand(landRequestOptions);
      } else {
        request = await runner.enqueue(landRequestOptions);
      }

      if (request) {
        if (req.body.priority === 'low') {
          await request.decrementPriority();
        } else if (req.body.priority === 'high') {
          await request.incrementPriority();
        }

        if (req.body.impact) {
          await request.updateImpact(req.body.impact);
        }
      }

      Logger.info('Land request created', {
        namespace: 'routes:api:create-landrequest',
        landRequestOptions,
      });

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
    '/priority/:id',
    requireAuth('admin'),
    wrap(async (req, res) => {
      const requestId = req.params.id;
      if (!req.body) {
        return res.status(400).json({ err: 'body expected' });
      }
      const priority = parseInt(req.body.priority, 10);
      if (isNaN(priority)) {
        return res.status(400).json({ err: 'body.priority is required and needs to be a number ' });
      }
      Logger.verbose('Updating priority of land request', {
        namespace: 'routes:api:priority',
        requestId,
        priority,
      });
      const success = await runner.updateLandRequestPriority(requestId, priority);
      if (success) {
        res.json({ message: 'Updated priority of request' });
      } else {
        res.status(404).json({ error: 'Land request does not exist' });
      }
    }),
  );

  router.post(
    '/fail-build',
    requireCustomToken,
    wrap(async (req, res) => {
      if (!req.body || !req.body.buildId) {
        return res.status(400).json({ err: 'req.body.buildId expected' });
      }

      Logger.info('Failing land request', {
        namespace: 'routes:api:fail-build',
        buildId: req.body.buildId,
      });

      runner.onStatusUpdate({
        buildId: req.body.buildId,
        buildStatus: 'FAILED',
      });

      res.sendStatus(200);
    }),
  );

  return router;
}
