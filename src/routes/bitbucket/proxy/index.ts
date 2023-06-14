import express from 'express';
import { authenticateIncomingBBCall, wrap, permission } from '../../middleware';
import { BitbucketClient } from '../../../bitbucket/BitbucketClient';
import { permissionService } from '../../../lib/PermissionService';
import { config } from '../../../lib/Config';
import { LandRequestOptions } from '../../../types';
import { Runner } from '../../../lib/Runner';
import { Logger } from '../../../lib/Logger';
import { eventEmitter } from '../../../lib/Events';
import { StateService } from '../../../lib/StateService';
import { validatePriorityBranch } from '../../../lib/utils/helper-functions';

interface LandBody {
  mergeStrategy?: IMergeStrategy;
}

export function proxyRoutes(runner: Runner, client: BitbucketClient) {
  const router = express();

  const { prSettings } = config;

  router.use(authenticateIncomingBBCall);

  router.post(
    '/can-land',
    wrap(async (req, res) => {
      const { aaid, pullRequestId, sourceBranch, destinationBranch } = req.query as {
        aaid: string;
        pullRequestId: string;
        accountId: string;
        sourceBranch: string;
        destinationBranch: string;
      };
      const prId = parseInt(pullRequestId, 10);

      Logger.info('Requesting land checks', {
        namespace: 'routes:bitbucket:proxy:can-land',
        pullRequestId,
      });

      const errors: string[] = [];
      const warnings: string[] = [];
      const abortErrors: string[] = [];
      const [bannerMessage, permissionLevel, requestStatus] = await Promise.all([
        StateService.getBannerMessageState(),
        permissionService.getPermissionForUser(aaid),
        runner.getLandRequestStateByPRId(prId),
      ]);

      if (permission(permissionLevel).isAtLeast('land')) {
        if (requestStatus?.state === 'merging' || requestStatus?.state === 'success') {
          res.json({
            canLand: false,
            canLandWhenAble: false,
            state: requestStatus?.state,
            errors,
            warnings,
            bannerMessage,
          });
          return;
        }
        const pauseState = await StateService.getPauseState();

        if (pauseState) {
          errors.push(`Builds have been manually paused: "${pauseState.reason}"`);
        } else {
          const landChecks = await runner.isAllowedToLand({
            pullRequestId: prId,
            permissionLevel,
            queueFetcher: runner.getWaitingAndQueued,
            sourceBranch,
            destinationBranch,
            commit: null,
          });

          warnings.push(...landChecks.warnings);
          errors.push(...landChecks.errors);
          abortErrors.push(...landChecks.abortErrors);
        }
      } else {
        errors.push("You don't have land permissions");
      }

      Logger.info('Land checks determined', {
        namespace: 'routes:bitbucket:proxy:can-land',
        pullRequestId,
        errors,
        warnings,
        abortErrors,
      });

      res.json({
        canLand: abortErrors.length === 0 && errors.length === 0,
        canLandWhenAble: abortErrors.length === 0 && prSettings.allowLandWhenAble,
        state: requestStatus?.state,
        errors,
        warnings,
        bannerMessage,
      });
    }),
  );

  router.post(
    '/queue',
    wrap(async (req, res) => {
      const { aaid } = req.query as {
        aaid: string;
        pullRequestId: string;
        accountId: string;
      };

      const [permissionLevel, queue] = await Promise.all([
        permissionService.getPermissionForUser(aaid),
        runner.getQueue(),
      ]);

      if (!permission(permissionLevel).isAtLeast('land')) {
        res.status(403).send("You don't have land permissions");
        return;
      }

      return res.json({ queue });
    }),
  );

  router.post(
    '/settings',
    wrap(async (req, res) => {
      return res.json(config ? config.widgetSettings : {});
    }),
  );

  router.post(
    '/land',
    wrap(async (req, res) => {
      const { aaid, pullRequestId, commit, accountId } = req.query as Record<string, string>;
      const { mergeStrategy } = req.body as LandBody;
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
        mergeStrategy,
      };

      const request = await runner.enqueue(landRequest);

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

      const priorityBranches = await StateService.getPriorityBranches();
      const isPriorityBranch = validatePriorityBranch(priorityBranches, landRequest.prSourceBranch);
      if (isPriorityBranch && request) {
        await request.incrementPriority();
        Logger.info(`Priority increased as ${landRequest.prSourceBranch} is a priority branch.`, {
          namespace: 'routes:bitbucket:proxy:land',
          pullRequestId: prId,
          landRequest,
        });
      }

      const priority = await client.bitbucket.getPullRequestPriority(commit);

      if (request) {
        if (priority === 'HIGH') {
          await request.incrementPriority();
          Logger.info('Pull request priority increased', {
            namespace: 'routes:bitbucket:proxy:land',
            pullRequestId: prId,
            landRequest,
          });
        }

        const { speculationEngineEnabled } = await StateService.getAdminSettings();
        if (speculationEngineEnabled) {
          const impact = await client.bitbucket.getPRImpact(commit);
          request.updateImpact(impact);
        }
      }
      res.sendStatus(200);
      runner.next();
    }),
  );

  router.post(
    '/land-when-able',
    wrap(async (req, res) => {
      const { aaid, pullRequestId, commit, accountId } = req.query as Record<string, string>;
      const { mergeStrategy } = req.body as LandBody;
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
        mergeStrategy,
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
