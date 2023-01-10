import Redis from 'ioredis-mock';
import { BitbucketClient } from '../../bitbucket/BitbucketClient';
import { Logger } from '../Logger';
import { LandRequestQueue } from '../Queue';
import { Runner } from '../Runner';

import { LandRequest, LandRequestStatus, PullRequest } from '../../db';
import { Config } from '../../types';

jest.mock('../utils/redis-client', () => ({
  // @ts-ignore incorrect type definition
  client: new Redis(),
}));

jest.mock('../../db/index');
jest.mock('../../bitbucket/BitbucketClient');
jest.mock('../Config');

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
    runner = new Runner(mockQueue, {} as any, mockClient, { maxConcurrentBuilds: 2 } as Config);
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

  describe('Check running landrequests for timeout', () => {
    test('should not fail land request if timeout period is not breached', async () => {
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
        date: new Date(), //running state is within the timeout period of 2 hours
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'running',
      });

      await wait(500);
      mockQueue.getRunning = jest.fn(async () => [status]);

      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.checkRunningLandRequests();

      expect(request.setStatus).not.toHaveBeenCalled();
    });

    test('should fail land request if timeout period is breached', async () => {
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
        date: new Date('2022-12-13T03:42:48.071Z'), //running state is beyond the timeout period of 2 hours
        id: '1',
        isLatest: true,
        request,
        requestId: '1',
        state: 'running',
      });

      mockQueue.getRunning = jest.fn(async () => [status]);

      expect(request.setStatus).not.toHaveBeenCalled();
      await runner.checkRunningLandRequests();

      expect(request.setStatus).toHaveBeenCalledTimes(1);
      expect(request.setStatus).toHaveBeenCalledWith('fail', 'Build timeout period breached');
    });
  });

  describe('moveFromQueueToRunning', () => {
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
      jest.spyOn(runner, 'getPauseState').mockImplementationOnce(() => Promise.resolve({} as any));
      await runner.moveFromQueueToRunning({} as any, {} as any);
      expect(getRunningSpy).not.toHaveBeenCalled();
    });
  });

  describe('onStatusUpdate', () => {
    let request: LandRequest;
    let nextSpy: jest.SpyInstance<any>;
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
      const runningStatus = new LandRequestStatus({
        date: new Date(120),
        id: '0',
        isLatest: true,
        request,
        requestId: '0',
        state: 'running',
      });
      mockQueue.getRunning = jest.fn(async () => [runningStatus]);
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
  });
});
