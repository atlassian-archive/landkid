import { BitbucketClient } from '../BitbucketClient';

jest.mock('../../lib/Config');
jest.mock('../BitbucketPipelinesAPI');
jest.mock('../BitbucketAPI');

const mockConfig = {
  repoConfig: { repoName: 'repo', repoOwner: 'owner' },
  mergeSettings: {
    mergeBlocking: {
      enabled: true,
      builds: [
        {
          targetBranch: 'master',
          pipelineFilterFn: (pipelines: any[]) =>
            pipelines.filter(({ state }) => state === 'IN_PROGRESS'),
        },
      ],
    },
  },
};

describe('BitbucketClient', () => {
  let client: BitbucketClient;
  beforeEach(() => {
    client = new BitbucketClient(mockConfig as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isBlockingBuildRunning', () => {
    test('should return notRunning if targetBranch is not configured', async () => {
      const { running } = await client.isBlockingBuildRunning('develop');
      expect(running).toBe(false);
    });

    test('should return notRunning if blocking build is not running', async () => {
      jest.spyOn((client as any).pipelines, 'getPipelines').mockResolvedValueOnce({
        values: [
          {
            state: 'COMPLETED',
          },
        ],
      } as any);

      const { running } = await client.isBlockingBuildRunning('master');
      expect(running).toBe(false);
    });

    test('should return running if blocking build is running', async () => {
      jest.spyOn((client as any).pipelines, 'getPipelines').mockResolvedValueOnce({
        values: [
          {
            state: 'IN_PROGRESS',
          },
        ],
      } as any);

      const { running } = await client.isBlockingBuildRunning('master');
      expect(running).toBe(true);
    });
  });
});
