import * as express from 'express';
import { authenticateIncomingBBCall, wrap, permission } from '../../middleware';
import { BitbucketClient } from '../../../bitbucket/BitbucketClient';
import { permissionService } from '../../../lib/PermissionService';
import { config } from '../../../lib/Config';
import { LandRequestOptions } from '../../../types';
import { Runner } from '../../../lib/Runner';
import { Logger } from '../../../lib/Logger';

export function proxyRoutes(runner: Runner, client: BitbucketClient) {
  const router = express();

  const { prSettings } = config;

  router.use(authenticateIncomingBBCall);

  router.post(
    '/can-land',
    wrap(async (req, res) => {
      const { aaid, pullRequestId } = req.query as {
        aaid: string;
        pullRequestId: string;
      };
      const prId = parseInt(pullRequestId, 10);

      Logger.info('Requesting land checks', {
        namespace: 'routes:bitbucket:proxy:can-land',
        pullRequestId,
      });

      const errors: string[] = [];
      const landCheckErrors: string[] = [];
      const bannerMessage = await runner.getBannerMessageState();

      const permissionLevel = await permissionService.getPermissionForUser(aaid);
      if (permission(permissionLevel).isAtLeast('land')) {
        const pauseState = await runner.getPauseState();
        if (pauseState) {
          errors.push(`Builds have been manually paused: "${pauseState.reason}"`);
        } else {
          const landChecks = await client.isAllowedToLand(prId, permissionLevel);
          errors.push(...landChecks.errors);
          landCheckErrors.push(...landChecks.errors);

          const queued = await runner.queue.getQueue();
          const waiting = await runner.queue.getStatusesForWaitingRequests();

          for (const queueItem of [...queued, ...waiting]) {
            if (queueItem.request.pullRequest.prId === prId) {
              errors.push('This PR has already been queued, patience young padawan');
              break;
            }
          }
        }
      } else {
        errors.push("You don't have land permissions");
      }

      Logger.verbose('Land checks determined', {
        namespace: 'routes:bitbucket:proxy:can-land',
        errors,
      });

      res.json({
        canLand: errors.length === 0,
        canLandWhenAble: errors.length === landCheckErrors.length && prSettings.allowLandWhenAble,
        errors,
        bannerMessage,
      });
    }),
  );

  router.post(
    '/land',
    wrap(async (req, res) => {
      const { aaid, pullRequestId, commit } = req.query as Record<string, string>;
      const prId = parseInt(pullRequestId, 10);
      Logger.verbose('Request to land', {
        namespace: 'routes:bitbucket:proxy:land',
        pullRequestId: prId,
      });

      if (!pullRequestId || !aaid || !commit) {
        res.sendStatus(404);
        return;
      }

      const prInfo = await client.bitbucket.getPullRequest(prId);

      const landRequest: LandRequestOptions = {
        prId,
        triggererAaid: aaid,
        commit,
        prTitle: prInfo.title,
        prAuthorAaid: prInfo.authorAaid,
        prTargetBranch: prInfo.targetBranch,
      };

      await runner.enqueue(landRequest);
      Logger.info('Pull request landed', {
        namespace: 'routes:bitbucket:proxy:land',
        pullRequestId: prId,
        landRequest,
      });

      res.sendStatus(200);
      runner.next();
    }),
  );

  router.post(
    '/land-when-able',
    wrap(async (req, res) => {
      const { aaid, pullRequestId, commit } = req.query as Record<string, string>;
      const prId = parseInt(pullRequestId, 10);
      Logger.verbose('Request to land when able', {
        namespace: 'routes:bitbucket:proxy:land-when-able',
        pullRequestId: prId,
      });

      if (!pullRequestId || !aaid || !commit) {
        res.sendStatus(400);
        return;
      }

      const prInfo = await client.bitbucket.getPullRequest(prId);

      const landRequest: LandRequestOptions = {
        prId,
        triggererAaid: aaid,
        commit,
        prTitle: prInfo.title,
        prAuthorAaid: prInfo.authorAaid,
        prTargetBranch: prInfo.targetBranch,
      };
      await runner.addToWaitingToLand(landRequest);
      Logger.info('Pull request will land when able', {
        namespace: 'routes:bitbucket:proxy:land-when-able',
        pullRequestId: prId,
        landRequest,
      });

      res.sendStatus(200);
    }),
  );

  return router;
}
