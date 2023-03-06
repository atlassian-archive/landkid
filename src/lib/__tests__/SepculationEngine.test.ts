import { LandRequest, LandRequestStatus, PullRequest } from '../../db';
import { SepculationEngine } from '../SpeculationEngine';
import { StateService } from '../StateService';

jest.mock('../StateService');

describe('SepculationEngine', () => {
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
          triggererAaid: '123',
          pullRequestId: 1,
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
          pullRequestId: 1,
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
    jest.spyOn(StateService, 'getMaxConcurrentBuilds').mockResolvedValueOnce(3);
    expect(await SepculationEngine.getAvailableSlots(mockRunning)).toBe(1);
    expect(await SepculationEngine.getAvailableSlots([])).toBe(3);
  });

  test('positionInQueue > should return position in queue', async () => {
    expect(await SepculationEngine.positionInQueue(mockQueued, mockQueued[1])).toBe(1);
    expect(await SepculationEngine.positionInQueue(mockQueued, mockQueued[0])).toBe(0);
  });

  test('getImpact > should return impact', async () => {
    const impact = await SepculationEngine.getImpact(mockQueued, 0);

    // todo update after actual implementation of impact logic
    expect(typeof impact.currentImpact).toBe('number');
    expect(typeof impact.nextImpact).toBe('number');
  });

  describe('reOrderRequest', () => {
    test('should return false when the feature is turned off', async () => {
      jest
        .spyOn(StateService, 'getAdminSettings')
        .mockResolvedValueOnce({ speculationEngineEnabled: false } as any);

      expect(await SepculationEngine.reOrderRequest(mockRunning, mockQueued, mockQueued[0])).toBe(
        false,
      );
    });
    test('should return false when number of free slots are less than 2', async () => {});
    test('should return false when queue length is less than 2', async () => {});
    test('should return false when number of free slots are 2 and current request is 2nd in the queue', async () => {});
    test('should return false when number of free slots are 3 and current request is 3rd in the queue', async () => {});
    test('should return false when number of free slots are 2, current request is 1st in the queue and current request`s impact is less than next', async () => {});
    test('should return true when number of free slots are 2, current request is 1st in the queue and current request`s impact is greater than next', async () => {});
  });
});
