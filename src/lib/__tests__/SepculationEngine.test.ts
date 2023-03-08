import { LandRequest, LandRequestStatus, PullRequest } from '../../db';
import { SpeculationEngine } from '../SpeculationEngine';
import { StateService } from '../StateService';

jest.mock('../StateService');
jest.mock('../../db/index');

describe('SpeculationEngine', () => {
  let mockQueued: LandRequestStatus[] = [];
  let mockRunning: LandRequestStatus[] = [];
  let mockPullRequest: BB.PullRequest;
  beforeEach(() => {
    mockPullRequest = {
      pullRequestId: 1,
      authorAaid: '123',
      title: 'Foo',
      sourceBranch: 'test',
      targetBranch: 'master',
      commit: 'abc',
    } as BB.PullRequest;
    const pullRequest = new PullRequest({
      prId: mockPullRequest.pullRequestId,
      authorAaid: mockPullRequest.authorAaid,
      title: mockPullRequest.title,
      targetBranch: mockPullRequest.targetBranch,
    });
    mockQueued = [
      new LandRequestStatus({
        date: new Date(120),
        id: '0',
        isLatest: true,
        request: new LandRequest({
          created: new Date(120),
          forCommit: 'abc',
          id: '0',
          impact: 100,
          triggererAaid: '123',
          pullRequestId: 0,
          pullRequest,
        }),
        requestId: '0',
        state: 'queued',
      }),
      new LandRequestStatus({
        date: new Date(120),
        id: '1',
        isLatest: true,
        request: new LandRequest({
          created: new Date(120),
          forCommit: 'abc',
          id: '1',
          impact: 50,
          triggererAaid: '123',
          pullRequestId: 1,
          pullRequest,
        }),
        requestId: '0',
        state: 'queued',
      }),
    ];

    mockRunning = [
      new LandRequestStatus({
        date: new Date(120),
        id: '0',
        isLatest: true,
        request: new LandRequest({
          created: new Date(120),
          forCommit: 'abc',
          id: '0',
          triggererAaid: '123',
          pullRequestId: 0,
          pullRequest,
        }),
        requestId: '0',
        state: 'running',
      }),
      new LandRequestStatus({
        date: new Date(120),
        id: '1',
        isLatest: true,
        request: new LandRequest({
          created: new Date(120),
          forCommit: 'abc',
          id: '1',
          triggererAaid: '123',
          pullRequestId: 1,
          pullRequest,
        }),
        requestId: '0',
        state: 'running',
      }),
    ];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getAvailableSlots > should return availabled free slots', async () => {
    jest.spyOn(StateService, 'getMaxConcurrentBuilds').mockResolvedValue(3);
    expect(await SpeculationEngine.getAvailableSlots(mockRunning)).toBe(1);
    expect(await SpeculationEngine.getAvailableSlots([])).toBe(3);
  });

  test('positionInQueue > should return position in queue', async () => {
    expect(await SpeculationEngine.positionInQueue(mockQueued, mockQueued[1])).toBe(1);
    expect(await SpeculationEngine.positionInQueue(mockQueued, mockQueued[0])).toBe(0);
  });

  test('getImpact > should return impact', async () => {
    const impact = await SpeculationEngine.getImpact(mockQueued, 0);

    expect(impact.currentImpact).toBe(100);
    expect(impact.nextImpact).toBe(50);
  });

  describe('reOrderRequest', () => {
    test('should return false when the feature is turned off', async () => {
      jest
        .spyOn(StateService, 'getAdminSettings')
        .mockResolvedValueOnce({ speculationEngineEnabled: false } as any);
      jest.spyOn(SpeculationEngine, 'getImpact').mockResolvedValueOnce({
        currentImpact: 10,
        nextImpact: 100,
      });
      const reOrder = await SpeculationEngine.reOrderRequest(
        mockRunning,
        mockQueued,
        mockQueued[0],
      );

      expect(SpeculationEngine.getImpact).not.toHaveBeenCalled();
      expect(reOrder).toBe(false);
    });

    describe('when feature is turned on', () => {
      beforeEach(() => {
        jest.spyOn(StateService, 'getAdminSettings').mockResolvedValue({
          speculationEngineEnabled: true,
        } as any);
        jest.spyOn(StateService, 'getMaxConcurrentBuilds').mockResolvedValueOnce(3);
        jest.spyOn(SpeculationEngine, 'getImpact').mockResolvedValueOnce({
          currentImpact: 10,
          nextImpact: 100,
        });
      });
      test('should not re-order when number of free slots are less than 2', async () => {
        // 1 free slots, getMaxConcurrentBuilds is 3 and running is 2
        // queued length is 2
        // position in queue is 0
        let reOrder = await SpeculationEngine.reOrderRequest(
          mockRunning,
          mockQueued,
          mockQueued[0],
        );
        expect(SpeculationEngine.getImpact).not.toHaveBeenCalled();
        expect(reOrder).toBe(false);

        // 0 free slots, getMaxConcurrentBuilds is 2 and running is 2
        // queued length is 2
        // position in queue is 0
        jest.spyOn(StateService, 'getMaxConcurrentBuilds').mockResolvedValueOnce(2);
        reOrder = await SpeculationEngine.reOrderRequest(mockRunning, mockQueued, mockQueued[0]);
        expect(SpeculationEngine.getImpact).not.toHaveBeenCalled();
        expect(reOrder).toBe(false);
      });

      test('should not re-order when queue length is less than 2', async () => {
        // 2 free slots, getMaxConcurrentBuilds is 3 and running is 1
        // queued length is 1
        // position in queue is 0
        const reOrder = await SpeculationEngine.reOrderRequest(
          [mockRunning[0]],
          [mockQueued[0]],
          mockQueued[0],
        );
        expect(SpeculationEngine.getImpact).not.toHaveBeenCalled();
        expect(reOrder).toBe(false);
      });

      test('should not re-order when number of free slots are 2 and current request is 2nd in the queue', async () => {
        // 2 free slots, getMaxConcurrentBuilds is 3 and running is 1
        // queued length is 2
        // position in queue is 1 ie 2nd in the queue
        const reOrder = await SpeculationEngine.reOrderRequest(
          [mockRunning[0]],
          mockQueued,
          mockQueued[1],
        );
        expect(SpeculationEngine.getImpact).not.toHaveBeenCalled();
        expect(reOrder).toBe(false);
      });

      test('should not re-order when number of free slots are 3 and current request is 3rd in the queue', async () => {
        // 3 free slots, getMaxConcurrentBuilds is 3 and running is 0
        // queued length is 4
        // position in queue is 2 ie 3rd in the queue
        const queuedRequestStatus = new LandRequestStatus({
          id: '3',
          state: 'queued',
          request: new LandRequest({ pullRequestId: 3 }),
        });

        const reOrder = await SpeculationEngine.reOrderRequest(
          [],
          [...mockQueued, queuedRequestStatus],
          queuedRequestStatus,
        );
        expect(SpeculationEngine.getImpact).not.toHaveBeenCalled();
        expect(reOrder).toBe(false);
      });

      test('should not re-order when number of free slots are 2, current request is 1st in the queue and current request`s impact is less than next', async () => {
        // 2 free slots, getMaxConcurrentBuilds is 3 and running is 1
        // queued length is 2
        // position in queue is 0 ie 1st in the queue

        const reOrder = await SpeculationEngine.reOrderRequest(
          [mockRunning[0]],
          mockQueued,
          mockQueued[0],
        );

        expect(SpeculationEngine.getImpact).toHaveBeenCalledWith(mockQueued, 0);
        expect(reOrder).toBe(false);
      });
      test('should re-order when number of free slots are 2, current request is 1st in the queue and current request`s impact is greater than next', async () => {
        // 2 free slots, getMaxConcurrentBuilds is 3 and running is 1
        // queued length is 2
        // position in queue is 0 ie 1st in the queue
        (SpeculationEngine.getImpact as jest.Mock).mockReset();
        jest.spyOn(SpeculationEngine, 'getImpact').mockResolvedValueOnce({
          currentImpact: 200,
          nextImpact: 100,
        });

        const reOrder = await SpeculationEngine.reOrderRequest(
          [mockRunning[0]],
          mockQueued,
          mockQueued[0],
        );

        expect(SpeculationEngine.getImpact).toHaveBeenCalledWith(mockQueued, 0);
        expect(reOrder).toBe(true);
      });
    });
  });
});
