import { LandRequest, LandRequestStatus, PullRequest } from '../../db';
import { SpeculationEngine } from '../SpeculationEngine';
import { StateService } from '../StateService';

jest.mock('../StateService');
jest.mock('../../db/index');

let mockQueued: LandRequestStatus[] = [];
let mockRunning: LandRequestStatus[] = [];
let mockPullRequest: BB.PullRequest = {
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

const landRequestA = new LandRequestStatus({
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
});

const landRequestB = new LandRequestStatus({
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
});

const landRequestC = new LandRequestStatus({
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
});
const landRequestD = new LandRequestStatus({
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
});

describe('SpeculationEngine', () => {
  beforeEach(() => {
    mockPullRequest = {
      pullRequestId: 1,
      authorAaid: '123',
      title: 'Foo',
      sourceBranch: 'test',
      targetBranch: 'master',
      commit: 'abc',
    } as BB.PullRequest;

    mockQueued = [landRequestA, landRequestB];
    mockRunning = [landRequestC, landRequestD];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  test('getAvailableSlots > should return available free slots', async () => {
    jest.spyOn(StateService, 'getMaxConcurrentBuilds').mockResolvedValue(3);
    expect(await SpeculationEngine.getAvailableSlots(mockRunning)).toBe(1);
    expect(await SpeculationEngine.getAvailableSlots([])).toBe(3);
  });

  test('positionInQueue > should return position in queue', () => {
    expect(SpeculationEngine.getPositionInQueue(mockQueued, mockQueued[1])).toBe(1);
    expect(SpeculationEngine.getPositionInQueue(mockQueued, mockQueued[0])).toBe(0);
  });

  test('getLowestImpactedRequestStatus > should return the lowest impact land request', () => {
    const impact = SpeculationEngine.getLowestImpactedRequestStatus(mockQueued, 0, 2);
    expect(impact).toEqual(landRequestB);
  });

  describe('When a reorder request is successful', () => {
    test('feature is turned on', () => {
      beforeEach(() => {
        jest.spyOn(StateService, 'getAdminSettings').mockResolvedValue({
          speculationEngineEnabled: true,
        } as any);
        jest.spyOn(StateService, 'getMaxConcurrentBuilds').mockResolvedValueOnce(3);
        jest
          .spyOn(SpeculationEngine, 'getLowestImpactedRequestStatus')
          .mockReturnValue(landRequestA);
      });
    });
  });

  describe('When a reorder request is unsuccessful', () => {
    test('feature is turned off', async () => {
      jest
        .spyOn(StateService, 'getAdminSettings')
        .mockResolvedValueOnce({ speculationEngineEnabled: false } as any);
      jest.spyOn(SpeculationEngine, 'getLowestImpactedRequestStatus').mockReturnValue(landRequestB);
      const reorder = await SpeculationEngine.reorderRequest(
        mockRunning.slice(0, 2),
        mockQueued.slice(0, 2),
        mockQueued[0],
      );

      expect(SpeculationEngine.getLowestImpactedRequestStatus).not.toHaveBeenCalled();
      expect(reorder).toBe(false);
    });

    test('should re-order when number of free slots are 2, current request is 1st in the queue and current request`s impact is greater than next', async () => {
      // 2 free slots, getMaxConcurrentBuilds is 3 and running is 1
      // queued length is 2
      // position in queue is 0 ie 1st in the queue
      (SpeculationEngine.getLowestImpactedRequestStatus as jest.Mock).mockReset();
      jest.spyOn(SpeculationEngine, 'getLowestImpactedRequestStatus').mockReturnValue(landRequestB);

      const reorder = await SpeculationEngine.reorderRequest(
        [mockRunning[0]],
        mockQueued.slice(0, 2),
        mockQueued[0],
      );

      expect(SpeculationEngine.getLowestImpactedRequestStatus).toHaveBeenCalledWith(
        mockQueued.slice(0, 2),
        0,
        2,
      );
      expect(reorder).toBe(true);
    });

    test('should not re-order when number of free slots are less than 2', async () => {
      // 1 free slots, getMaxConcurrentBuilds is 3 and running is 2
      // queued length is 2
      // position in queue is 0
      let reorder = await SpeculationEngine.reorderRequest(
        mockRunning.slice(0, 2),
        mockQueued.slice(0, 2),
        mockQueued[0],
      );
      expect(SpeculationEngine.getLowestImpactedRequestStatus).not.toHaveBeenCalled();
      expect(reorder).toBe(false);

      // 0 free slots, getMaxConcurrentBuilds is 2 and running is 2
      // queued length is 2
      // position in queue is 0
      jest.spyOn(StateService, 'getMaxConcurrentBuilds').mockResolvedValueOnce(2);
      reorder = await SpeculationEngine.reorderRequest(
        mockRunning.slice(0, 2),
        mockQueued.slice(0, 2),
        mockQueued[0],
      );
      expect(SpeculationEngine.getLowestImpactedRequestStatus).not.toHaveBeenCalled();
      expect(reorder).toBe(false);
    });

    test('should not re-order when queue length is less than 2', async () => {
      // 2 free slots, getMaxConcurrentBuilds is 3 and running is 1
      // queued length is 1
      // position in queue is 0
      const reorder = await SpeculationEngine.reorderRequest(
        [mockRunning[0]],
        [mockQueued[0]],
        mockQueued[0],
      );
      expect(SpeculationEngine.getLowestImpactedRequestStatus).not.toHaveBeenCalled();
      expect(reorder).toBe(false);
    });

    test('should not re-order when number of free slots are 2 and current request is 2nd in the queue', async () => {
      // 2 free slots, getMaxConcurrentBuilds is 3 and running is 1
      // queued length is 2
      // position in queue is 1 ie 2nd in the queue
      const reorder = await SpeculationEngine.reorderRequest(
        [mockRunning[0]],
        mockQueued.slice(0, 2),
        mockQueued[1],
      );
      expect(SpeculationEngine.getLowestImpactedRequestStatus).not.toHaveBeenCalled();
      expect(reorder).toBe(false);
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

      const reorder = await SpeculationEngine.reorderRequest(
        [],
        [...mockQueued, queuedRequestStatus],
        queuedRequestStatus,
      );
      expect(SpeculationEngine.getLowestImpactedRequestStatus).not.toHaveBeenCalled();
      expect(reorder).toBe(false);
    });

    test('should not re-order when number of free slots are 2, current request is 1st in the queue and current request`s impact is less than next', async () => {
      // 2 free slots, getMaxConcurrentBuilds is 3 and running is 1
      // queued length is 2
      // position in queue is 0 ie 1st in the queue

      const reorder = await SpeculationEngine.reorderRequest(
        [mockRunning[0]],
        mockQueued.slice(0, 2),
        mockQueued[0],
      );

      expect(SpeculationEngine.getLowestImpactedRequestStatus).toHaveBeenCalledWith(
        mockQueued,
        0,
        2,
      );
      expect(reorder).toBe(false);
    });

    test('should not re-order when number of free slots are 2, current request is 1st in the queue and current request`s impact is equal to the next request', async () => {
      // 2 free slots, getMaxConcurrentBuilds is 3 and running is 1
      // queued length is 2
      // position in queue is 0 ie 1st in the queue
      (SpeculationEngine.getLowestImpactedRequestStatus as jest.Mock).mockReset();
      jest.spyOn(SpeculationEngine, 'getLowestImpactedRequestStatus').mockReturnValue(landRequestA);

      const reorder = await SpeculationEngine.reorderRequest(
        [mockRunning[0]],
        mockQueued.slice(0, 2),
        mockQueued[0],
      );

      expect(SpeculationEngine.getLowestImpactedRequestStatus).toHaveBeenCalledWith(
        mockQueued.slice(0, 2),
        0,
        2,
      );
      expect(reorder).toBe(false);
    });
  });
});
