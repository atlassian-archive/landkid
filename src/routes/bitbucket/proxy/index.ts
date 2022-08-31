import express from 'express';
import { authenticateIncomingBBCall, wrap, permission } from '../../middleware';
import { BitbucketClient } from '../../../bitbucket/BitbucketClient';
import { permissionService } from '../../../lib/PermissionService';
import { config } from '../../../lib/Config';
import { LandRequestOptions } from '../../../types';
import { Runner } from '../../../lib/Runner';
import { Logger } from '../../../lib/Logger';
import { eventEmitter } from '../../../lib/Events';
import MeasureTime from '../../../measureTime';

export function proxyRoutes(runner: Runner, client: BitbucketClient) {
  const router = express();

  const { prSettings } = config;

  router.use(authenticateIncomingBBCall);

  router.post(
    '/can-land',
    wrap(async (req, res) => {
      const check = new MeasureTime()
      const { aaid, pullRequestId } = req.query as {
        aaid: string;
        pullRequestId: string;
        accountId: string;
      };
      const prId = parseInt(pullRequestId, 10);

      Logger.info('Requesting land checks', {
        namespace: 'routes:bitbucket:proxy:can-land',
        pullRequestId,
      });

      const errors: string[] = [];
      const warnings: string[] = [];
      let existingRequest = false;
      const bannerMessage = await runner.getBannerMessageState();
      check.measure('getBannerMessageState', 'can-land')

      const permissionLevel = await permissionService.getPermissionForUser(aaid);
      check.measure('getPermissionForUser', 'can-land')

      if (permission(permissionLevel).isAtLeast('land')) {
        const pauseState = await runner.getPauseState();
        check.measure('getPauseState', 'can-land')

        if (pauseState) {
          errors.push(`Builds have been manually paused: "${pauseState.reason}"`);
        } else {
          const landChecks = await runner.isAllowedToLand(
            prId,
            permissionLevel,
            runner.getWaitingAndQueued,
          );
          check.measure('isAllowedToLand', 'can-land')

          warnings.push(...landChecks.warnings);
          errors.push(...landChecks.errors);
          if (landChecks.existingRequest) {
            existingRequest = true;
            errors.push('Pull request has already been queued');
          }
        }
      } else {
        errors.push("You don't have land permissions");
      }

      Logger.info('Land checks determined', {
        namespace: 'routes:bitbucket:proxy:can-land',
        pullRequestId,
        errors,
        warnings,
      });

      res.json({
        canLand: errors.length === 0,
        canLandWhenAble: !existingRequest && prSettings.allowLandWhenAble,
        errors,
        warnings,
        bannerMessage,
      });
    }),
  );

  router.post(
    '/land',
    wrap(async (req, res) => {
      const { aaid, pullRequestId, commit, accountId } = req.query as Record<string, string>;
      const prId = parseInt(pullRequestId, 10);
      Logger.verbose('Request to land', {
        namespace: 'routes:bitbucket:proxy:land',
        pullRequestId: prId,
      });

      if (!pullRequestId || !aaid || !commit) {
        eventEmitter.emit('PULL_REQUEST.QUEUE.FAIL', {
          pullRequestId: prId,
          commit: commit,
          sourceBranch: 'unknown',
          targetBranch: 'unknown',
        });

        res.sendStatus(404);
        return;
      }

      const prInfo = await client.bitbucket.getPullRequest(prId);

      const landRequest: LandRequestOptions = {
        prId,
        triggererAaid: aaid,
        triggererAccountId: accountId,
        commit,
        prTitle: prInfo.title,
        prAuthorAaid: prInfo.authorAaid,
        prAuthorAccountId: prInfo.author,
        prSourceBranch: prInfo.sourceBranch,
        prTargetBranch: prInfo.targetBranch,
      };

      await runner.enqueue(landRequest);
      Logger.info('Pull request queued', {
        namespace: 'routes:bitbucket:proxy:land',
        pullRequestId: prId,
        landRequest,
      });

      eventEmitter.emit('PULL_REQUEST.QUEUE.SUCCESS', {
        pullRequestId: prId,
        commit: commit,
        sourceBranch: prInfo.sourceBranch,
        targetBranch: prInfo.targetBranch,
      });

      res.sendStatus(200);
      runner.next();
    }),
  );

  router.post(
    '/land-when-able',
    wrap(async (req, res) => {
      const { aaid, pullRequestId, commit, accountId } = req.query as Record<string, string>;
      const prId = parseInt(pullRequestId, 10);
      Logger.verbose('Request to land when able', {
        namespace: 'routes:bitbucket:proxy:land-when-able',
        pullRequestId: prId,
      });

      if (!pullRequestId || !aaid || !commit) {
        eventEmitter.emit('PULL_REQUEST.QUEUE_WHEN_ABLE.FAIL');

        res.sendStatus(400);
        return;
      }

      const prInfo = await client.bitbucket.getPullRequest(prId);

      const landRequest: LandRequestOptions = {
        prId,
        triggererAaid: aaid,
        triggererAccountId: accountId,
        commit,
        prTitle: prInfo.title,
        prAuthorAaid: prInfo.authorAaid,
        prAuthorAccountId: prInfo.author,
        prSourceBranch: prInfo.sourceBranch,
        prTargetBranch: prInfo.targetBranch,
      };
      await runner.addToWaitingToLand(landRequest);
      Logger.info('Pull request will land when able', {
        namespace: 'routes:bitbucket:proxy:land-when-able',
        pullRequestId: prId,
        landRequest,
      });

      eventEmitter.emit('PULL_REQUEST.QUEUE_WHEN_ABLE.SUCCESS', {
        pullRequestId: prId,
        commit,
        sourceBranch: prInfo.sourceBranch,
        targetBranch: prInfo.targetBranch,
      });

      res.sendStatus(200);
    }),
  );

  return router;
}
