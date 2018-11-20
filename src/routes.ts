import * as express from 'express';
import * as path from 'path';
import Runner from './Runner';
import Client from './Client';
import onStatus from './events/onStatus';
import Logger from './Logger';
import { LandRequestOptions } from './types';

const bitbucketAddonDescriptor: any = require('./static/bitbucket/atlassian-connect.json');

function wrap(fn: express.RequestHandler): express.RequestHandler {
  return async (req, res, next) => {
    try {
      await Promise.resolve(fn(req, res, next));
    } catch (err) {
      next(err);
    }
  };
}

export default function routes(
  server: express.Application,
  client: Client,
  runner: Runner,
) {
  bitbucketAddonDescriptor.baseUrl = server.settings.baseUrl;
  const usersAllowedToMerge = server.settings.usersAllowedToMerge;
  const allowLandWhenAble = server.settings.allowLandWhenAble;
  // TODO: Definitely clean up where this logic sits, it's all a hack atm
  if (server.settings.repoUuid) {
    bitbucketAddonDescriptor.modules.webPanels[0].conditions.push({
      condition: 'equals',
      target: 'repository.uuid',
      params: {
        value: server.settings.repoUuid,
      },
    });
  }

  server.get(
    '/',
    wrap((req, res) => {
      res.sendStatus(200);
    }),
  );

  server.get('/healthcheck', (req, res) => {
    res.sendStatus(200);
  });

  server.get(
    '/api/current-state',
    wrap(async (req, res) => {
      const state = await runner.getState();
      Logger.info(state, 'Requesting current state');
      res.header('Access-Control-Allow-Origin', '*').json(state);
    }),
  );

  server.get(
    '/api/settings',
    wrap(async (req, res) => {
      const settings = { allowLandWhenAble, usersAllowedToMerge };
      Logger.info(settings, 'Requesting current settings');
      res.header('Access-Control-Allow-Origin', '*').json(settings);
    }),
  );

  server.get(
    '/api/is-allowed-to-land/:pullRequestId',
    wrap(async (req, res) => {
      const pullRequestId = req.params.pullRequestId;
      const isAllowedToLand = await client.isAllowedToLand(pullRequestId);
      res.header('Access-Control-Allow-Origin', '*').json({ isAllowedToLand });
    }),
  );

  server.post(
    '/api/land-pr/:pullRequestId',
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
      // const pullRequestUrl = client.createPullRequestUrl(pullRequestId);

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
      const positionInQueue = runner.enqueue(landRequest);
      Logger.info({ landRequest, positionInQueue }, 'Request to land received');

      res
        .header('Access-Control-Allow-Origin', '*')
        .status(200)
        .json({ positionInQueue });
      runner.next();
    }),
  );

  server.post(
    '/api/land-when-able/:pullRequestId',
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

      // const pullRequestUrl = client.createPullRequestUrl(pullRequestId);

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
      Logger.info({ landRequest }, 'Request to land when able received');
      runner.addToWaitingToLand(landRequest);
      res
        .header('Access-Control-Allow-Origin', '*')
        .status(200)
        .json({});
    }),
  );

  server.post(
    '/api/cancel-pr/:pullRequestId',
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

      Logger.info(
        { requestedToRemove: pullRequestId },
        'Request to remove land request',
      );

      res
        .header('Access-Control-Allow-Origin', '*')
        .status(200)
        .json({
            newQueue: [],
          // newQueue: state.queue,
        });
    }),
  );

  server.post('/api/pause', (req, res) => {
    let pausedReason = 'Paused via API';
    if (req && req.body && req.body.reason) {
      pausedReason = String(req.body.reason);
    }
    runner.pause(pausedReason);
    res.json({ paused: true, pausedReason });
  });

  server.post('/api/unpause', (req, res) => {
    runner.unpause();
    res.json({ paused: false });
  });

  // this is another escape hatch that we expose in case we ever get in a weird state. Its safe to
  // expose
  server.post('/api/next', (req, res) => {
    runner.next();
    res.json({ message: 'Calling next()' });
  });

  server.post(
    '/webhook/status-updated',
    wrap(async (req, res) => {
      res.status(200).send({});
      // status event will be null if we don't care about it
      const statusEvent = onStatus(client, req.body);
      if (!statusEvent) return;
      runner.onStatusUpdate(statusEvent);
    }),
  );

  // Note: since this path is here first, atlassian-connect.json will be served here, not from the
  // the express.static call below (we need to send the modified descriptor)
  server.get('/bitbucket/atlassian-connect.json', (req, res) => {
    res
      .header('Access-Control-Allow-Origin', '*')
      .json(bitbucketAddonDescriptor);
  });

  // if we are in a production build, then serve static files from our static directories (front end
  // ui code)
  if (process.env.NODE_ENV === 'production') {
    server.use(express.static(path.join(__dirname, 'static')));
  }

  // TODO: I don't think this is working as intended right now, dig into this
  server.use(((err, _, res, next) => {
    if (err) {
      Logger.error({ err }, 'Error ');
      res.status(500).send({
        error: err.message,
        stack: err.stack,
      });
    } else {
      next();
    }
  }) as express.ErrorRequestHandler);
}
