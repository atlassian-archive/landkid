// @flow
import express from 'express';
import path from 'path';
import { type LandRequest } from './types';
import Queue from './Queue';
import Runner from './Runner';
import Client from './Client';
import onStatus from './events/onStatus';
import Logger from './Logger';
import bitbucketAddonDescriptor from './static/bitbucket/atlassian-connect.json';

function wrap(fn: Function) {
  return (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default function routes(server: any, client: Client, runner: Runner) {
  bitbucketAddonDescriptor.baseUrl = server.settings.baseUrl;
  const usersAllowedToMerge = server.settings.usersAllowedToMerge;

  server.get(
    '/',
    wrap((req, res) => {
      res.sendStatus(200);
    })
  );

  server.get('/healthcheck', (req, res) => {
    res.sendStatus(200);
  });

  server.get(
    '/api/current-state',
    wrap(async (req, res) => {
      const state = runner.getState();
      Logger.info(state, 'Requesting current state');
      res
        .header('Access-Control-Allow-Origin', '*')
        .json({ ...state, usersAllowedToMerge });
    })
  );

  server.get(
    '/api/is-allowed-to-land/:pullRequestId',
    wrap(async (req, res) => {
      const pullRequestId = req.params.pullRequestId;
      const isAllowedToLand = await client.isAllowedToLand(pullRequestId);
      res.header('Access-Control-Allow-Origin', '*').json({ isAllowedToLand });
    })
  );

  server.post(
    '/api/land-pr/:pullRequestId',
    wrap(async (req, res) => {
      const pullRequestId = req.params.pullRequestId;
      const username = req.query.username;
      const userUuid = req.query.userUuid;
      const commit = req.query.commit;
      const title = req.query.title;
      // obviously we need more checks than this later
      if (!pullRequestId || !userUuid || !commit || !title) {
        res.sendStatus(404);
        return;
      }

      const landRequest: LandRequest = {
        pullRequestId,
        username,
        userUuid,
        commit,
        title
      };
      const positionInQueue = runner.enqueue(landRequest);
      Logger.info({ landRequest, positionInQueue }, 'Request to land received');

      res
        .header('Access-Control-Allow-Origin', '*')
        .status(200)
        .json({ positionInQueue });
      runner.next();
    })
  );

  server.post(
    '/api/cancel-pr/:pullRequestId',
    wrap(async (req, res) => {
      const pullRequestId = String(req.params.pullRequestId);
      const userUuid = req.query.userUuid;
      const username = req.query.username;

      // do proper checks here to know if a person is allowed to cancel the build?
      if (!pullRequestId || !userUuid) {
        res.sendStatus(404);
        return;
      }
      if (runner.running && runner.running.pullRequestId === pullRequestId) {
        runner.cancelCurrentlyRunningBuild();
      }
      runner.removeLandReuqestByPullRequestId(pullRequestId);

      const state = runner.getState();

      Logger.info(
        { requestedToRemove: pullRequestId },
        'Request to remove land request'
      );

      res
        .header('Access-Control-Allow-Origin', '*')
        .status(200)
        .json({ newQueue: state.queue });
    })
  );

  server.post(
    '/webhook/status-updated',
    wrap(async (req, res) => {
      res.status(200).send({});
      // status event will be null if we don't care about it
      const statusEvent = onStatus(client, req.body, runner);
      if (!statusEvent) return;
      runner.mergePassedBuildIfRunning(statusEvent);
    })
  );

  // Note: since this path is here first, atlassian-connect.json will be served here, not from the
  // the express.static call below (we need to send the modified descriptor)
  server.get('/bitbucket/atlassian-connect.json', (req, res) => {
    res
      .header('Access-Control-Allow-Origin', '*')
      .json(bitbucketAddonDescriptor);
  });

  // serve static files from the 'static' directory
  server.use(express.static(path.join(__dirname, 'static')));

  server.use((err, req, res, next) => {
    if (err) {
      Logger.error({ err }, 'Error ');
      res.status(500).send({ error: err.message, stack: err.stack });
    } else {
      next();
    }
  });
}
