import * as express from 'express';

import { wrap } from '../middleware';
import { config } from '../../lib/Config';
import { Runner } from '../../lib/Runner';
import { Logger } from '../../lib/Logger';
import { LandRequestOptions } from '../../types';
import { BitbucketClient } from '../../bitbucket/BitbucketClient';

export function apiRoutes(runner: Runner, client: BitbucketClient) {
  const router = express();

  router.get(
    '/current-state',
    wrap(async (req, res) => {
      const state = await runner.getState();
      Logger.info('Requesting current state');
      res.header('Access-Control-Allow-Origin', '*').json(state);
    }),
  );

  router.get(
    '/settings',
    wrap(async (req, res) => {
      Logger.info('Requesting current settings', config.prSettings);
      res.header('Access-Control-Allow-Origin', '*').json(config.prSettings);
    }),
  );

  router.get(
    '/is-allowed-to-land/:pullRequestId',
    wrap(async (req, res) => {
      const pullRequestId = req.params.pullRequestId;
      const isAllowedToLand = await client.isAllowedToLand(pullRequestId);
      res.header('Access-Control-Allow-Origin', '*').json({ isAllowedToLand });
    }),
  );

  router.post(
    '/land-pr/:pullRequestId',
    wrap(async (req, res) => {
      const pullRequestId = req.params.pullRequestId;
      // const username = req.query.username;
      const userUuid = req.query.userUuid;
      const commit = req.query.commit;
      const title = req.query.title;
      // obviously we need more checks than this later
      if (!pullRequestId || !userUuid || !commit || !title) {
        res.sendStatus(404);
        return;
      }

      // TODO: This logic should live in routes
      const landRequest: LandRequestOptions = {
        // buildStatus: 'QUEUED',
        prId: pullRequestId,
        // pullRequestUrl,
        // username,
        triggererAaid: userUuid,
        commit,
        prTitle: title,
        // TODO: Get PR Author AAID
        prAuthorAaid: '',
        // createdTime: new Date(),
      };
      const positionInQueue = await runner.enqueue(landRequest);
      Logger.info('Request to land received', { landRequest, positionInQueue });

      res
        .header('Access-Control-Allow-Origin', '*')
        .status(200)
        .json({ positionInQueue });
      runner.next();
    }),
  );

  router.post(
    '/land-when-able/:pullRequestId',
    wrap(async (req, res) => {
      const pullRequestId = req.params.pullRequestId;
      // const username = req.query.username;
      const userUuid = req.query.userUuid;
      const commit = req.query.commit;
      const title = req.query.title;
      // obviously we need more checks than this later
      if (!pullRequestId || !userUuid || !commit || !title) {
        res.sendStatus(404);
        return;
      }

      const landRequest: LandRequestOptions = {
        // buildStatus: 'QUEUED',
        prId: pullRequestId,
        // pullRequestUrl,
        // username,
        triggererAaid: userUuid,
        commit,
        prTitle: title,
        // TODO: Get PR Author AAID
        prAuthorAaid: '',
        // createdTime: new Date(),
      };
      // const positionInQueue = runner.enqueue(landRequest);
      Logger.info('Request to land when able received', { landRequest });
      await runner.addToWaitingToLand(landRequest);
      res
        .header('Access-Control-Allow-Origin', '*')
        .status(200)
        .json({});
    }),
  );

  router.post(
    '/cancel-pr/:pullRequestId',
    wrap(async (req, res) => {
      const pullRequestId = parseInt(req.params.pullRequestId, 10);
      const userUuid = req.query.userUuid;

      // TODO: Move all business logic out of routes
      // do proper checks here to know if a person is allowed to cancel the build?
      if (!pullRequestId || !userUuid) {
        res.sendStatus(404);
        return;
      }
      const running = await runner.getRunning();
      if (running && running.request.pullRequestId === pullRequestId) {
        runner.cancelCurrentlyRunningBuild();
      }
      runner.removeLandRequestByPullRequestId(pullRequestId);

      // const state = runner.getState();

      Logger.info('Request to remove land request', {
        requestedToRemove: pullRequestId,
      });

      res
        .header('Access-Control-Allow-Origin', '*')
        .status(200)
        .json({
          newQueue: [],
          // newQueue: state.queue,
        });
    }),
  );

  router.post('/pause', (req, res) => {
    let pausedReason = 'Paused via API';
    if (req && req.body && req.body.reason) {
      pausedReason = String(req.body.reason);
    }
    runner.pause(pausedReason);
    res.json({ paused: true, pausedReason });
  });

  router.post('/unpause', (req, res) => {
    runner.unpause();
    res.json({ paused: false });
  });

  // this is another escape hatch that we expose in case we ever get in a weird state. Its safe to
  // expose
  router.post('/next', (req, res) => {
    runner.next();
    res.json({ message: 'Calling next()' });
  });

  return router;
}
