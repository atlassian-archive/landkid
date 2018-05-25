//@flow
import test from 'ava';
import nock from 'nock';
import request from 'supertest';
import sinon from 'sinon';

import config from './_config';
import app from '../../src/index';
import logger from '../../src/Logger';
import waitUntil from '../_waitUntil';

import * as mockPrs from './fixtures/prs';
import * as mockStatuses from './fixtures/statuses';
import * as mockWebhooks from './fixtures/webhooks';

sinon.stub(logger);

test('incoming healthcheck', async t => {
  const server = app(config);
  let res = await request(server).get('/');

  t.is(res.status, 200);
});

test('incoming - /api/current-state - default', async t => {
  const server = app(config);
  let res = await request(server).get('/api/current-state');

  t.is(res.status, 200);
  // body.started should be a date string but we cant know it ahead of time
  // we'll check that it is a string, then hack it's value
  t.truthy(typeof res.body.started === 'string');
  res.body.started = 'today';

  t.deepEqual(res.body, {
    queue: [],
    waitingToLand: [],
    running: {},
    locked: false,
    paused: false,
    pausedReason: null,
    started: 'today',
  });
});

test('incoming - /api/is-allowed-to-land/ - PR is completely ready', async t => {
  const server = app(config);
  nock('https://api.bitbucket.org')
    .get('/2.0/repositories/repo_owner/repo_name/pullrequests/1')
    .reply(200, mockPrs.prOpenApproved);
  nock('https://api.bitbucket.org')
    .get('/2.0/repositories/repo_owner/repo_name/pullrequests/1/statuses')
    .reply(200, mockStatuses.singleSuccessful);

  let res = await request(server).get('/api/is-allowed-to-land/1');

  t.is(res.status, 200);
  t.deepEqual(res.body, {
    isAllowedToLand: {
      isOpen: true,
      isApproved: true,
      isGreen: true,
      allTasksClosed: true,
      isAllowed: true,
    },
  });
});

test('incoming - /api/is-allowed-to-land/ - PR has red build', async t => {
  const server = app(config);
  nock('https://api.bitbucket.org')
    .get('/2.0/repositories/repo_owner/repo_name/pullrequests/1')
    .reply(200, mockPrs.prOpenApproved);
  nock('https://api.bitbucket.org')
    .get('/2.0/repositories/repo_owner/repo_name/pullrequests/1/statuses')
    .reply(200, mockStatuses.singleFailed);

  let res = await request(server).get('/api/is-allowed-to-land/1');

  t.is(res.status, 200);
  t.deepEqual(res.body, {
    isAllowedToLand: {
      isOpen: true,
      isApproved: true,
      isGreen: false,
      allTasksClosed: true,
      isAllowed: false,
    },
  });
});

test('incoming - /api/is-allowed-to-land/ - Closed and merged', async t => {
  const server = app(config);
  nock('https://api.bitbucket.org')
    .get('/2.0/repositories/repo_owner/repo_name/pullrequests/1')
    .reply(200, mockPrs.prClosedMerged);
  nock('https://api.bitbucket.org')
    .get('/2.0/repositories/repo_owner/repo_name/pullrequests/1/statuses')
    .reply(200, mockStatuses.doubleSuccessful);

  let res = await request(server).get('/api/is-allowed-to-land/1');

  t.is(res.status, 200);
  t.deepEqual(res.body, {
    isAllowedToLand: {
      isOpen: false,
      isApproved: true,
      isGreen: true,
      allTasksClosed: true,
      isAllowed: false,
    },
  });
});

test('e2e - /api/land-pr/ - Approved and green', async t => {
  const server = app(config);
  nock('https://api.bitbucket.org')
    .get('/2.0/repositories/repo_owner/repo_name/pullrequests/1')
    .reply(200, mockPrs.prOpenApproved);
  nock('https://api.bitbucket.org')
    .get('/2.0/repositories/repo_owner/repo_name/pullrequests/1/statuses')
    .reply(200, mockStatuses.singleSuccessful);
  const createPipelines = nock('https://api.bitbucket.org')
    .post('/2.0/repositories/repo_owner/repo_name/pipelines/', {
      target: {
        commit: { hash: '0601da78f467', type: 'commit' },
        selector: { type: 'custom', pattern: 'landkid' },
        type: 'pipeline_commit_target',
      },
    })
    .reply(200, { build_number: 3 });
  const mergePullRequest = nock('https://api.bitbucket.org')
    .post('/2.0/repositories/repo_owner/repo_name/pullrequests/1/merge')
    .reply(200);

  const paramsStr =
    'repoOwner=repo_owner&repoSlug=some_repo&username=user_1&state=OPEN&title=AK-888+Some+issue&pullRequestId=1&userUuid=%7B62cc1a9a-9f43-4518-b604-9c044626bf10%7D&commit=0601da78f467';
  let res = await request(server)
    .post(`/api/land-pr/1`)
    .query(paramsStr);

  t.is(res.status, 200);
  t.deepEqual(res.body, { positionInQueue: 0 });

  await waitUntil(() =>
    request(server)
      .get('/api/current-state')
      .then(response => response.body.running.hasOwnProperty('pullRequestId')),
  );

  res = await request(server).get('/api/current-state');
  t.is(res.status, 200);
  // have to hack the `createdTime` time as we can't know it
  res.body.running.createdTime = 'today';
  t.deepEqual(res.body.running, {
    pullRequestId: '1',
    username: 'user_1',
    userUuid: '{62cc1a9a-9f43-4518-b604-9c044626bf10}',
    commit: '0601da78f467',
    title: 'AK-888 Some issue',
    buildId: '3',
    buildStatus: 'PENDING',
    createdTime: 'today',
  });

  // make sure we called the POST endpoint to create a build
  t.truthy(createPipelines.isDone());

  await request(server)
    .post('/webhook/status-updated')
    .send(mockWebhooks.successful);

  // Haven't needed to pause here yet, but just in case, we'll leave this here
  // await waitUntil(() => Promise.resolve(mergePullRequest.isDone()));
  // Check that we hit the merge endpoint to merge the PR
  t.truthy(mergePullRequest.isDone());
});

test('e2e - /api/land-pr/ - Approved and green - failed landkid build', async t => {
  const server = app(config);
  nock('https://api.bitbucket.org')
    .get('/2.0/repositories/repo_owner/repo_name/pullrequests/1')
    .reply(200, mockPrs.prOpenApproved);
  nock('https://api.bitbucket.org')
    .get('/2.0/repositories/repo_owner/repo_name/pullrequests/1/statuses')
    .reply(200, mockStatuses.singleSuccessful);
  const createPipelines = nock('https://api.bitbucket.org')
    .post('/2.0/repositories/repo_owner/repo_name/pipelines/', {
      target: {
        commit: {
          hash: '0601da78f467',
          type: 'commit',
        },
        selector: {
          type: 'custom',
          pattern: 'landkid',
        },
        type: 'pipeline_commit_target',
      },
    })
    .reply(200, {
      build_number: 3,
    });
  const mergePullRequest = nock('https://api.bitbucket.org')
    .post('/2.0/repositories/repo_owner/repo_name/pullrequests/1/merge')
    .reply(200);

  const paramsStr =
    'repoOwner=repo_owner&repoSlug=some_repo&username=user_1&state=OPEN&title=AK-888+Some+issue&pullRequestId=1&userUuid=%7B62cc1a9a-9f43-4518-b604-9c044626bf10%7D&commit=0601da78f467';
  let res = await request(server)
    .post(`/api/land-pr/1`)
    .query(paramsStr);

  t.is(res.status, 200);
  t.deepEqual(res.body, {
    positionInQueue: 0,
  });

  await waitUntil(() =>
    request(server)
      .get('/api/current-state')
      .then(response => response.body.running !== null),
  );

  res = await request(server).get('/api/current-state');
  t.is(res.status, 200);
  res.body.running.createdTime = 'today';

  t.deepEqual(res.body.running, {
    pullRequestId: '1',
    username: 'user_1',
    userUuid: '{62cc1a9a-9f43-4518-b604-9c044626bf10}',
    commit: '0601da78f467',
    title: 'AK-888 Some issue',
    buildId: '3',
    createdTime: 'today',
    buildStatus: 'PENDING',
  });

  // make sure we called the POST endpoint to create a build
  t.is(createPipelines.isDone(), true);

  await request(server)
    .post('/webhook/status-updated')
    .send(mockWebhooks.failed);

  // we'll wait till the current status says we've gotten rid of the build
  await waitUntil(() =>
    request(server)
      .get('/api/current-state')
      .then(response => response.body.running.buildId === undefined),
  );

  // make sure we still haven't hit the mergePullRequest endpoint
  t.is(mergePullRequest.isDone(), false);
});

test('retrying - should retry a failed merge attempt', async t => {
  const server = app(config);
  nock('https://api.bitbucket.org')
    .get('/2.0/repositories/repo_owner/repo_name/pullrequests/1')
    .reply(200, mockPrs.prOpenApproved);
  nock('https://api.bitbucket.org')
    .get('/2.0/repositories/repo_owner/repo_name/pullrequests/1/statuses')
    .reply(200, mockStatuses.singleSuccessful);
  const createPipelines = nock('https://api.bitbucket.org')
    .post('/2.0/repositories/repo_owner/repo_name/pipelines/', {
      target: {
        commit: { hash: '0601da78f467', type: 'commit' },
        selector: { type: 'custom', pattern: 'landkid' },
        type: 'pipeline_commit_target',
      },
    })
    .reply(200, { build_number: 3 });
  nock('https://api.bitbucket.org')
    .post('/2.0/repositories/repo_owner/repo_name/pullrequests/1/merge')
    .times(2)
    .reply(500); // we'll fail twice, then succeed
  const successfulMerge = nock('https://api.bitbucket.org')
    .post('/2.0/repositories/repo_owner/repo_name/pullrequests/1/merge')
    .reply(200); // Then succeed

  const paramsStr =
    'repoOwner=repo_owner&repoSlug=some_repo&username=user_1&state=OPEN&title=AK-888+Some+issue&pullRequestId=1&userUuid=%7B62cc1a9a-9f43-4518-b604-9c044626bf10%7D&commit=0601da78f467';
  let res = await request(server)
    .post(`/api/land-pr/1`)
    .query(paramsStr);

  // wait until we're in the runnign position
  await waitUntil(() =>
    request(server)
      .get('/api/current-state')
      .then(response => response.body.running.hasOwnProperty('pullRequestId')),
  );
  // pretend the landkid build finished
  await request(server)
    .post('/webhook/status-updated')
    .send(mockWebhooks.successful);

  // little bit weird, but it's the easiest way to wait until we are ready, wait until our actual
  // assertion is true
  await waitUntil(() => successfulMerge.isDone());

  t.is(successfulMerge.isDone(), true);
});
