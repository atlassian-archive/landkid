import Redis from 'ioredis-mock';
import { BitbucketClient } from '../../bitbucket/BitbucketClient';
import { eventEmitter } from '../Events';
import { Logger } from '../Logger';
import { LandRequestQueue } from '../Queue';
import { Runner } from '../Runner';

import { LandRequest, LandRequestStatus, PullRequest } from '../../db';
import { Config } from '../../types';
import { StateService } from '../StateService';

jest.mock('../utils/redis-client', () => ({
  // @ts-ignore incorrect type definition
  client: new Redis(),
}));

jest.mock('../../db/index');
jest.mock('../../bitbucket/BitbucketClient');
jest.mock('../Config');
jest.mock('../PermissionService');
jest.mock('../StateService');

// https://stackoverflow.com/a/58716087
function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

const wait = (duration: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration);
  });

// need to wait 3 seconds here because redlock will retry for another 2 seconds when failed to acquire the lock
const returnAfter3Seconds = async () => {
  await wait(3000);
  return [];
};

// Restore the original logger.Error function and don't throw when we expect errors to occur
function expectLoggerError(loggerErrorSpy: jest.SpyInstance<any, any>) {
  loggerErrorSpy.mockImplementation(() => {
    return undefined as any;
  });
}

// Spy on each logging function and suppress their output
// To temporarily unsuppress while debugging, comment out the "mockImplementation" calls
function suppressAndSpyLogging() {
  const info = jest.spyOn(Logger, 'info').mockImplementation(() => {
    return undefined as any;
  });
  const warn = jest.spyOn(Logger, 'warn').mockImplementation(() => {
    return undefined as any;
  });
  // Log the actual error from catch-all error handlers and throw to ensure we explicitly handle
  // error cases in tests
  const origLoggerError = Logger.error;
  const error = jest.spyOn(Logger, 'error').mockImplementation(((msg: any, payload: any) => {
    origLoggerError(msg, payload);
    const err = payload.err || msg;
    throw err;
  }) as any);
  return { info, warn, error };
}

describe('Runner', () => {
  let runner: Runner;
  let mockQueue: LandRequestQueue;
  let loggerSpies: {
    info: jest.SpyInstance<any, any>;
    warn: jest.SpyInstance<any, any>;
    error: jest.SpyInstance<any, any>;
  };
  let mockPullRequest: BB.PullRequest;
  let mockClient: BitbucketClient;

  beforeEach(() => {
    mockQueue = {
      getStatusesForWaitingRequests: jest.fn().mockImplementation(() => []),
      getQueue: jest.fn().mockImplementation(() => []),
      getRunning: jest.fn().mockImplementation(() => []),
      maybeGetStatusForNextRequestInQueue: jest.fn(),
      maybeGetStatusForQueuedRequestById: jest.fn(),
    };
    mockPullRequest = {
      pullRequestId: 1,
      authorAaid: '123',
      title: 'Foo',
      sourceBranch: 'test',
      targetBranch: 'master',
      commit: 'abc',
    } as BB.PullRequest;
    jest.spyOn(Runner.prototype, 'init').mockImplementation();
    loggerSpies = suppressAndSpyLogging();
    mockClient = new BitbucketClient({} as any);
    jest.spyOn(mockClient, 'isAllowedToMerge').mockImplementation(() => {
      return {
        errors: [],
        warnings: [],
        pullRequest: mockPullRequest,
      } as any;
    });
    runner = new Runner(mockQueue, {} as any, mockClient, {
      maxConcurrentBuilds: 2,
      repoConfig: {},
    } as Config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Check waiting land requests', () => {
    describe('lock', () => {
      beforeEach(() => {
        mockQueue.getStatusesForWaitingRequests = jest.fn().mockImplementation(returnAfter3Seconds);
        mockQueue.getQueue = jest.fn().mockImplementation(returnAfter3Seconds);
      });
      test('checkWaitingLandRequests should not run when next is running', async () => {
        const nextPromise = runner.next();
        const checkPromise = runner.checkWaitingLandRequests();
        await Promise.all([nextPromise, checkPromise]);
        expect(loggerSpies.info).toHaveBeenCalledWith('Next() called', expect.anything());
        expect(loggerSpies.info).not.toHaveBeenCalledWith(
          'Checking for waiting landrequests ready to queue',
          expect.anything(),
        );
      });

      test('next can run when checkWaitingLandRequests is running', async () => {
        const checkPromise = runner.checkWaitingLandRequests();
        await wait(500);
        const nextPromise = runner.next();
        await Promise.all([nextPromise, checkPromise]);
        expect(loggerSpies.info).toHaveBeenCalledWith('Next() called', expect.anything());
        expect(loggerSpies.info).toHaveBeenCalledWith(
          'Checking for waiting landrequests ready to queue',
          expect.anything(),
        );
      });

      test('checkWaitingLandRequests should not run when it is already running', async () => {
        const checkPromise1 = runner.checkWaitingLandRequests();
        const checkPromise2 = runner.checkWaitingLandRequests();
        await Promise.all([checkPromise1, checkPromise2]);
        expect(
          loggerSpies.info.mock.calls.filter(
            (call) => call[0] === 'Checking for waiting landrequests ready to queue',
          ),
        ).toHaveLength(1);
      });
    });

    test('should successfully transition land request from waiting to queued if all checks pass', async () => {
      const request = new LandRequest({
        created: new Date(123),
        forCommit: 'abc',
        id: '1',
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest: new PullRequest({
          prId: mockPullRequest.pullRequestId,
          authorAaid: mockPullRequest.authorAaid,
          title: mockPullRequest.title,
          sourceBranch: mockPullRequest.sourceBranch,
          targetBranch: mockPullRequest.targetBranch,
        }),
      });
      const status = new LandRequestStatus({
        date: new Date(123),
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'will-queue-when-ready',
      });

      mockQueue.getStatusesForWaitingRequests = jest.fn(async () => [status]);

      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.checkWaitingLandRequests();
      expect(request.setStatus).toHaveBeenCalledTimes(1);
      expect(request.setStatus).toHaveBeenCalledWith(
        'queued',
        expect.stringContaining('Queued by'),
      );
    });

    test('should NOT transition land request from waiting to queued if NOT all land checks pass', async () => {
      const request = new LandRequest({
        created: new Date(123),
        forCommit: 'abc',
        id: '1',
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest: new PullRequest({
          prId: mockPullRequest.pullRequestId,
          authorAaid: mockPullRequest.authorAaid,
          title: mockPullRequest.title,
          targetBranch: mockPullRequest.targetBranch,
        }),
      });
      const status = new LandRequestStatus({
        date: new Date(123),
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'will-queue-when-ready',
      });

      mockQueue.getStatusesForWaitingRequests = jest.fn(async () => [status]);

      jest.spyOn(mockClient, 'isAllowedToMerge').mockImplementation(() => {
        return {
          errors: ['Must be approved'],
          warnings: [],
          pullRequest: mockPullRequest,
        } as any;
      });

      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.checkWaitingLandRequests();
      expect(request.setStatus).not.toHaveBeenCalled();
    });

    test('should abort land request if PR commit has changed', async () => {
      mockPullRequest.commit = 'def';
      const request = new LandRequest({
        created: new Date(123),
        forCommit: 'abc',
        id: '1',
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest: new PullRequest({
          prId: mockPullRequest.pullRequestId,
          authorAaid: mockPullRequest.authorAaid,
          title: mockPullRequest.title,
          targetBranch: mockPullRequest.targetBranch,
        }),
      });
      const status = new LandRequestStatus({
        date: new Date(123),
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'will-queue-when-ready',
      });

      mockQueue.getStatusesForWaitingRequests = jest.fn(async () => [status]);

      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.checkWaitingLandRequests();
      expect(request.setStatus).toHaveBeenCalledTimes(1);
      expect(request.setStatus).toHaveBeenCalledWith('aborted', 'PR commit changed after landing');
    });

    test('should abort land request if target branch has changed', async () => {
      const request = new LandRequest({
        created: new Date(123),
        forCommit: 'abc',
        id: '1',
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest: new PullRequest({
          prId: mockPullRequest.pullRequestId,
          authorAaid: mockPullRequest.authorAaid,
          title: mockPullRequest.title,
          targetBranch: 'develop',
        }),
      });
      const status = new LandRequestStatus({
        date: new Date(123),
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'will-queue-when-ready',
      });

      mockQueue.getStatusesForWaitingRequests = jest.fn(async () => [status]);

      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.checkWaitingLandRequests();
      expect(request.setStatus).toHaveBeenCalledTimes(1);
      expect(request.setStatus).toHaveBeenCalledWith(
        'aborted',
        'Target branch changed after landing',
      );
    });

    test('should abort land request if land request already exists for PR', async () => {
      const pullRequest = new PullRequest({
        prId: mockPullRequest.pullRequestId,
        authorAaid: mockPullRequest.authorAaid,
        title: mockPullRequest.title,
        targetBranch: mockPullRequest.targetBranch,
      });
      const request = new LandRequest({
        created: new Date(123),
        forCommit: 'abc',
        id: '1',
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest,
      });
      const status = new LandRequestStatus({
        date: new Date(123),
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'will-queue-when-ready',
      });

      const queuedStatus = new LandRequestStatus({
        date: new Date(120),
        id: '0',
        isLatest: true,
        request: new LandRequest({
          created: new Date(120),
          forCommit: 'abc',
          id: '0',
          triggererAaid: '123',
          pullRequestId: 1,
          pullRequest,
        }),
        requestId: '0',
        state: 'queued',
      });

      mockQueue.getStatusesForWaitingRequests = jest.fn(async () => [status]);
      mockQueue.getQueue = jest.fn(async () => [queuedStatus]);

      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.checkWaitingLandRequests();
      expect(request.setStatus).toHaveBeenCalledTimes(1);
      expect(request.setStatus).toHaveBeenCalledWith('aborted', 'Already has existing Land build');
    });
  });

  describe('Check running land requests for timeout', () => {
    let onStatusUpdateSpy: jest.SpyInstance;
    const getLandRequestStatus = (date: Date) => {
      const request = new LandRequest({
        created: new Date(123),
        forCommit: 'abc',
        id: '1',
        buildId: 1,
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest: mockPullRequest,
      });
      return new LandRequestStatus({
        date,
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'running',
      });
    };

    beforeEach(() => {
      onStatusUpdateSpy = jest.spyOn(runner, 'onStatusUpdate').mockResolvedValue();
    });

    afterEach(() => {
      onStatusUpdateSpy.mockRestore();
    });

    test('should get land build status (failed) if timeout period is not breached', async () => {
      jest.spyOn(mockClient, 'getLandBuild').mockResolvedValue({
        state: {
          result: {
            name: 'FAILED',
          },
        },
      } as any);
      const mockLandRequestStatus = getLandRequestStatus(new Date());

      //running state is within the timeout period of 2 hours
      mockQueue.getRunning = jest.fn(async () => [mockLandRequestStatus]);
      await wait(500);
      expect(mockLandRequestStatus.request.setStatus).not.toHaveBeenCalled();
      await runner.checkRunningLandRequests();

      expect(mockLandRequestStatus.request.setStatus).not.toHaveBeenCalled();
      expect(mockClient.getLandBuild).toHaveBeenCalled();
      expect(onStatusUpdateSpy).toHaveBeenCalledWith({
        buildId: 1,
        buildStatus: 'FAILED',
      });
    });

    test('should get land build status (running) if timeout period is not breached', async () => {
      jest.spyOn(mockClient, 'getLandBuild').mockResolvedValue({
        state: {
          stage: {
            name: 'RUNNING',
          },
        },
      } as any);
      //running state is within the timeout period of 2 hours
      const mockLandRequestStatus = getLandRequestStatus(new Date());

      await wait(500);
      mockQueue.getRunning = jest.fn(async () => [mockLandRequestStatus]);

      expect(mockLandRequestStatus.request.setStatus).not.toHaveBeenCalled();
      await runner.checkRunningLandRequests();

      expect(mockClient.getLandBuild).toHaveBeenCalled();
      expect(mockLandRequestStatus.request.setStatus).not.toHaveBeenCalled();
      expect(onStatusUpdateSpy).toHaveBeenCalledWith({
        buildId: 1,
        buildStatus: undefined,
      });
    });

    test('should fail land request if timeout period is breached', async () => {
      //running state is beyond the timeout period of 2 hours
      const mockLandRequestStatus = getLandRequestStatus(new Date('2022-12-13T03:42:48.071Z'));

      mockQueue.getRunning = jest.fn(async () => [mockLandRequestStatus]);

      expect(mockLandRequestStatus.request.setStatus).not.toHaveBeenCalled();
      await runner.checkRunningLandRequests();

      expect(mockLandRequestStatus.request.setStatus).toHaveBeenCalledTimes(1);
      expect(mockLandRequestStatus.request.setStatus).toHaveBeenCalledWith(
        'fail',
        'Build timeout period breached',
      );
    });
  });

  describe('areMaxConcurrentBuildsRunning', () => {
    test('should return true when all concurrent slots are used', async () => {
      const runningStatus = new LandRequestStatus({
        state: 'running',
      });

      const areMaxConcurrentBuildsRunning = await runner.areMaxConcurrentBuildsRunning([
        runningStatus,
        runningStatus,
      ]);
      expect(areMaxConcurrentBuildsRunning).toBe(true);
    });

    test('should return false when all concurrent slots are not used', async () => {
      const runningStatus = new LandRequestStatus({
        state: 'running',
      });
      const awaitingMergeStatus = new LandRequestStatus({
        state: 'awaiting-merge',
      });

      const areMaxConcurrentBuildsRunning = await runner.areMaxConcurrentBuildsRunning([
        runningStatus,
        awaitingMergeStatus,
      ]);
      expect(areMaxConcurrentBuildsRunning).toBe(false);
    });
  });

  describe('moveFromQueueToRunning', () => {
    test('should return false if all running slots are occupied', async () => {
      const request = new LandRequest({
        created: new Date(123),
        forCommit: 'abc',
        id: '1',
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest: new PullRequest({
          prId: mockPullRequest.pullRequestId,
          authorAaid: mockPullRequest.authorAaid,
          title: mockPullRequest.title,
          targetBranch: mockPullRequest.targetBranch,
        }),
      });
      const status = new LandRequestStatus({
        date: new Date(123),
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'queued',
      });
      jest.spyOn(runner, 'areMaxConcurrentBuildsRunning').mockResolvedValueOnce(true);

      const response = await runner.moveFromQueueToRunning(status, new Date());

      expect(runner.areMaxConcurrentBuildsRunning).toHaveBeenCalledWith([]);
      expect(response).toBe(false);
      expect(request.setStatus).not.toHaveBeenCalled();
    });

    test('should successfully transition land request from queued to running if all checks pass', async () => {
      const request = new LandRequest({
        created: new Date(123),
        forCommit: 'abc',
        id: '1',
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest: new PullRequest({
          prId: mockPullRequest.pullRequestId,
          authorAaid: mockPullRequest.authorAaid,
          title: mockPullRequest.title,
          targetBranch: mockPullRequest.targetBranch,
        }),
      });
      const status = new LandRequestStatus({
        date: new Date(123),
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'queued',
      });

      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.moveFromQueueToRunning(status, new Date(123));
      expect(request.setStatus).toHaveBeenCalledTimes(1);
      expect(request.setStatus).toHaveBeenCalledWith('running', undefined);
    });

    test('should fail land request if not all land checks pass', async () => {
      const request = new LandRequest({
        created: new Date(123),
        forCommit: 'abc',
        id: '1',
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest: new PullRequest({
          prId: mockPullRequest.pullRequestId,
          authorAaid: mockPullRequest.authorAaid,
          title: mockPullRequest.title,
          targetBranch: mockPullRequest.targetBranch,
        }),
      });
      const status = new LandRequestStatus({
        date: new Date(123),
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'queued',
      });

      jest.spyOn(mockClient, 'isAllowedToMerge').mockImplementation(() => {
        return {
          errors: ['Must be approved'],
          warnings: [],
          pullRequest: mockPullRequest,
        } as any;
      });

      expectLoggerError(loggerSpies.error);
      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.moveFromQueueToRunning(status, new Date(123));
      expect(request.setStatus).toHaveBeenCalledTimes(1);
      expect(request.setStatus).toHaveBeenCalledWith(
        'fail',
        'Unable to land due to failed land checks',
      );
    });

    test('should abort land request if PR commit has changed', async () => {
      mockPullRequest.commit = 'def';
      const request = new LandRequest({
        created: new Date(123),
        forCommit: 'abc',
        id: '1',
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest: new PullRequest({
          prId: mockPullRequest.pullRequestId,
          authorAaid: mockPullRequest.authorAaid,
          title: mockPullRequest.title,
          targetBranch: mockPullRequest.targetBranch,
        }),
      });
      const status = new LandRequestStatus({
        date: new Date(123),
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'queued',
      });

      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.moveFromQueueToRunning(status, new Date(123));
      expect(request.setStatus).toHaveBeenCalledTimes(1);
      expect(request.setStatus).toHaveBeenCalledWith('aborted', 'PR commit changed after landing');
    });

    test('should abort land request if target branch has changed', async () => {
      const request = new LandRequest({
        created: new Date(123),
        forCommit: 'abc',
        id: '1',
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest: new PullRequest({
          prId: mockPullRequest.pullRequestId,
          authorAaid: mockPullRequest.authorAaid,
          title: mockPullRequest.title,
          targetBranch: 'develop',
        }),
      });
      const status = new LandRequestStatus({
        date: new Date(123),
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'queued',
      });

      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.moveFromQueueToRunning(status, new Date(123));
      expect(request.setStatus).toHaveBeenCalledTimes(1);
      expect(request.setStatus).toHaveBeenCalledWith(
        'aborted',
        'Target branch changed after landing',
      );
    });

    test('should abort land request if land request already exists for the same PR ID ', async () => {
      const pullRequest = new PullRequest({
        prId: mockPullRequest.pullRequestId,
        authorAaid: mockPullRequest.authorAaid,
        title: mockPullRequest.title,
        targetBranch: mockPullRequest.targetBranch,
      });
      const request = new LandRequest({
        created: new Date(123),
        forCommit: 'abc',
        id: '1',
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest,
      });
      const status = new LandRequestStatus({
        date: new Date(123),
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'queued',
      });

      const runningStatus = new LandRequestStatus({
        date: new Date(120),
        id: '0',
        isLatest: true,
        request: new LandRequest({
          created: new Date(120),
          forCommit: 'abc',
          id: '0',
          triggererAaid: '123',
          pullRequestId: 1,
          pullRequest,
        }),
        requestId: '0',
        state: 'running',
      });

      mockQueue.getRunning = jest.fn(async () => [runningStatus]);

      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.moveFromQueueToRunning(status, new Date(123));
      expect(request.setStatus).toHaveBeenCalledTimes(1);
      expect(request.setStatus).toHaveBeenCalledWith('aborted', 'Already has existing Land build');
    });
  });

  describe('Pause builds', () => {
    let getRunningSpy: jest.SpyInstance;

    beforeAll(() => {});

    beforeEach(() => {
      getRunningSpy = jest.spyOn(runner, 'getRunning');
    });

    afterEach(() => {
      getRunningSpy.mockRestore();
    });

    test('moveFromQueueToRunning will not run when paused', async () => {
      jest
        .spyOn(StateService, 'getPauseState')
        .mockImplementationOnce(() => Promise.resolve({} as any));
      await runner.moveFromQueueToRunning({} as any, {} as any);
      expect(getRunningSpy).not.toHaveBeenCalled();
    });
  });

  describe('onStatusUpdate', () => {
    let request: LandRequest;
    let nextSpy: jest.SpyInstance<any>;
    let runningStatuses: LandRequestStatus[];
    beforeEach(() => {
      const pullRequest = new PullRequest({
        prId: mockPullRequest.pullRequestId,
        authorAaid: mockPullRequest.authorAaid,
        title: mockPullRequest.title,
        targetBranch: mockPullRequest.targetBranch,
      });
      request = new LandRequest({
        buildId: 1234,
        created: new Date(120),
        forCommit: 'abc',
        id: '0',
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest,
      });
      runningStatuses = [
        new LandRequestStatus({
          date: new Date(120),
          id: '0',
          isLatest: true,
          request,
          requestId: '0',
          state: 'running',
        }),
      ];
      mockQueue.getRunning = jest.fn(async () => runningStatuses);
      nextSpy = jest.spyOn(runner, 'next').mockImplementation(async () => {});
    });

    afterEach(() => {
      nextSpy.mockRestore();
    });

    it('should set land request status to awaiting-merge on successful build status', async () => {
      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.onStatusUpdate({
        buildId: 1234,
        buildStatus: 'SUCCESSFUL',
      });
      expect(request.setStatus).toHaveBeenCalledWith('awaiting-merge');
      expect(nextSpy).toHaveBeenCalledTimes(1);
    });

    it('should set land request status to fail on failed build status', async () => {
      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.onStatusUpdate({
        buildId: 1234,
        buildStatus: 'FAILED',
      });
      expect(request.setStatus).toHaveBeenCalledWith('fail', 'Landkid build failed');
      expect(nextSpy).toHaveBeenCalledTimes(1);
    });

    it('should set land request status to aborted on stopped build status', async () => {
      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.onStatusUpdate({
        buildId: 1234,
        buildStatus: 'STOPPED',
      });
      expect(request.setStatus).toHaveBeenCalledWith(
        'aborted',
        'Landkid pipelines build was stopped',
      );
      expect(nextSpy).toHaveBeenCalledTimes(1);
    });

    it('should ignore unknown status', async () => {
      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.onStatusUpdate({
        buildId: 1234,
        buildStatus: 'RANDOM' as any,
      });

      expect(request.setStatus).not.toHaveBeenCalled();
      expect(nextSpy).not.toHaveBeenCalled();
    });

    it('should not set status of request with non-matching build ID', async () => {
      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.onStatusUpdate({
        buildId: 567,
        buildStatus: 'SUCCESSFUL',
      });
      expect(request.setStatus).not.toHaveBeenCalled();
      expect(nextSpy).not.toHaveBeenCalled();
    });

    it('should not set status of request with matching build ID and currently in awaiting-merge state', async () => {
      runningStatuses = [
        new LandRequestStatus({
          date: new Date(120),
          id: '0',
          isLatest: true,
          request: new LandRequest({
            buildId: 1234,
            created: new Date(120),
            forCommit: 'abc',
            id: '0',
            triggererAaid: '123',
            pullRequestId: 1,
          }),
          requestId: '0',
          state: 'awaiting-merge',
        }),
      ];
      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.onStatusUpdate({
        buildId: 1234,
        buildStatus: 'SUCCESSFUL',
      });
      expect(request.setStatus).not.toHaveBeenCalled();
      expect(nextSpy).not.toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    test('should return current system state for read user', async () => {
      const state = await runner.getState(`user-id`);
      expect(state).toEqual(
        expect.objectContaining({
          bannerMessageState: null,
          bitbucketBaseUrl: 'https://bitbucket.org/undefined/undefined',
          daysSinceLastFailure: 10,
          maxConcurrentBuilds: 2,
          pauseState: null,
          permissionsMessage: undefined,
          priorityBranchList: [
            {
              id: 'test-id',
              branchName: 'test-branch/*',
              adminAaid: 'test-aaid',
              date: '2023-01-25T04:28:07.817Z',
            },
          ],
          queue: [],
          users: [],
          waitingToQueue: [],
        }),
      );
    });
  });

  describe('moveFromAwaitingMerge', () => {
    let emitSpy: jest.SpyInstance;
    beforeEach(() => {
      emitSpy = jest.spyOn(eventEmitter, 'emit');
    });
    test('should merge the pull request', async () => {
      const request = new LandRequest({
        created: new Date(123),
        forCommit: 'abc',
        id: '1',
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest: new PullRequest({
          prId: mockPullRequest.pullRequestId,
          authorAaid: mockPullRequest.authorAaid,
          title: mockPullRequest.title,
          sourceBranch: mockPullRequest.sourceBranch,
          targetBranch: mockPullRequest.targetBranch,
        }),
      });
      const status = new LandRequestStatus({
        date: new Date(123),
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'queued',
      });

      jest.spyOn(mockClient, 'mergePullRequest').mockImplementation(() => {
        return Promise.resolve({
          status: 'success',
        });
      });

      await runner.moveFromAwaitingMerge(status, new Date('2020-01-01'), []);
      // The merge isn't awaited within the function so we need to await it ourselves
      await flushPromises();
      expect(mockClient.mergePullRequest).toHaveBeenCalledTimes(1);
      expect(mockClient.mergePullRequest).toHaveBeenCalledWith(status, {
        skipCI: false,
        numRetries: 2,
      });
      expect(request.setStatus).toHaveBeenCalledTimes(2);
      expect(request.setStatus).toHaveBeenNthCalledWith(1, 'merging');
      expect(request.setStatus).toHaveBeenNthCalledWith(2, 'success');
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith('PULL_REQUEST.MERGE.SUCCESS', {
        landRequestId: request.id,
        pullRequestId: request.pullRequestId,
        commit: request.forCommit,
        sourceBranch: mockPullRequest.sourceBranch,
        targetBranch: mockPullRequest.targetBranch,
        duration: expect.any(Number),
      });
    });

    test('should not merge the pull request if the blocking build is running', async () => {
      const request = new LandRequest({
        created: new Date(123),
        forCommit: 'abc',
        id: '1',
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest: new PullRequest({
          prId: mockPullRequest.pullRequestId,
          authorAaid: mockPullRequest.authorAaid,
          title: mockPullRequest.title,
          sourceBranch: mockPullRequest.sourceBranch,
          targetBranch: mockPullRequest.targetBranch,
        }),
      });
      const status = new LandRequestStatus({
        date: new Date(123),
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'awaiting-merge',
      });
      jest
        .spyOn(StateService, 'getAdminSettings')
        .mockResolvedValueOnce({ mergeBlockingEnabled: true } as any);
      jest.spyOn(mockClient, 'isBlockingBuildRunning').mockResolvedValueOnce({ running: true });

      const response = await runner.moveFromAwaitingMerge(status, new Date('2020-01-01'), []);

      expect(response).toBe(false);
      expect(mockClient.isBlockingBuildRunning).toHaveBeenCalledWith('master');
      expect(request.setStatus).not.toHaveBeenCalled();
    });
    test('should merge the pull request if the blocking build is completed', async () => {
      const request = new LandRequest({
        created: new Date(123),
        forCommit: 'abc',
        id: '1',
        triggererAaid: '123',
        pullRequestId: 1,
        pullRequest: new PullRequest({
          prId: mockPullRequest.pullRequestId,
          authorAaid: mockPullRequest.authorAaid,
          title: mockPullRequest.title,
          sourceBranch: mockPullRequest.sourceBranch,
          targetBranch: mockPullRequest.targetBranch,
        }),
      });
      const status = new LandRequestStatus({
        date: new Date(123),
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'awaiting-merge',
      });
      jest
        .spyOn(StateService, 'getAdminSettings')
        .mockResolvedValueOnce({ mergeBlockingEnabled: true } as any);
      jest.spyOn(mockClient, 'isBlockingBuildRunning').mockResolvedValueOnce({ running: false });
      jest.spyOn(mockClient, 'mergePullRequest').mockResolvedValueOnce({
        status: 'success',
      });

      await runner.moveFromAwaitingMerge(status, new Date('2020-01-01'), []);
      // The merge isn't awaited within the function so we need to await it ourselves
      await flushPromises();

      expect(mockClient.isBlockingBuildRunning).toHaveBeenCalledWith('master');
      expect(request.setStatus).toHaveBeenCalledTimes(2);
      expect(request.setStatus).toHaveBeenNthCalledWith(1, 'merging');
      expect(request.setStatus).toHaveBeenNthCalledWith(2, 'success');
    });
  });
});
