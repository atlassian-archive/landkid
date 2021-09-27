import axios from 'axios';
import { Logger } from '../../src/lib/Logger';
import { BitbucketAPI } from '../../src/bitbucket/BitbucketAPI';
import { MergeOptions } from '../../src/types';

jest.mock('axios');
const mockedAxios = axios as unknown as jest.Mocked<typeof axios>;

jest.mock('delay');

jest.mock('../../src/bitbucket/BitbucketAuthenticator', () => ({
  bitbucketAuthenticator: {
    getAuthConfig: jest.fn(),
  },
}));

const loggerInfoSpy = jest.spyOn(Logger, 'info');

const landRequestStatus = {
  id: '1',
  request: {
    pullRequestId: 1,
    pullRequest: {
      targetBranch: 'master',
    },
  },
};

const bitbucketAPI = new BitbucketAPI({
  repoName: 'repo',
  repoOwner: 'owner',
});

const mergePullRequest = (request: any, opts?: MergeOptions) =>
  bitbucketAPI.mergePullRequest(request, opts);

describe('mergePullRequest', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('Successful merge first try', async () => {
    mockedAxios.post.mockResolvedValue({ status: 200 });
    expect(await mergePullRequest(landRequestStatus)).toEqual(BitbucketAPI.SUCCESS);
  });

  test('4xx merge failure', async () => {
    mockedAxios.post.mockResolvedValue({ status: 400 });
    expect(await mergePullRequest(landRequestStatus)).toEqual(BitbucketAPI.FAILED);
  });

  test('5xx merge failure', async () => {
    mockedAxios.post.mockResolvedValue({ status: 500 });
    expect(await mergePullRequest(landRequestStatus)).toEqual(BitbucketAPI.FAILED);
  });

  test('Successful timeout merge', async () => {
    mockedAxios.post.mockResolvedValue({ status: 202, headers: { location: '' } });
    mockedAxios.get
      .mockResolvedValueOnce({ data: { task_status: 'PENDING' } })
      .mockResolvedValueOnce({ data: { task_status: 'SUCCESS' } });
    expect(await mergePullRequest(landRequestStatus)).toEqual(BitbucketAPI.SUCCESS);
  });

  test('Failed timeout merge', async () => {
    mockedAxios.post.mockResolvedValue({ status: 202, headers: { location: '' } });
    mockedAxios.get
      .mockResolvedValueOnce({ data: { task_status: 'PENDING' } })
      .mockResolvedValueOnce({ data: { task_status: 'PENDING' } })
      .mockRejectedValueOnce({ response: {} });
    expect(await mergePullRequest(landRequestStatus)).toEqual(BitbucketAPI.FAILED);
  });

  test('Timeout merge polling', async () => {
    mockedAxios.post.mockResolvedValue({ status: 202, headers: { location: '' } });
    mockedAxios.get.mockResolvedValue({ data: { task_status: 'PENDING' } });
    expect(await mergePullRequest(landRequestStatus)).toEqual(BitbucketAPI.TIMEOUT);
  });

  test('Skip-ci merge', async () => {
    mockedAxios.post.mockResolvedValue({ status: 200 });
    await mergePullRequest(landRequestStatus, { skipCI: true });
    expect(loggerInfoSpy).toHaveBeenCalledWith(
      'Attempting to merge pull request',
      expect.objectContaining({
        commitMessage: expect.stringContaining('[skip ci]'),
      }),
    );
  });

  test('Get task count, should call API and return the correct number of tasks UNRESOLVED', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        values: [
          {
            state: 'RESOLVED',
          },
          {
            state: 'UNRESOLVED',
          },
        ],
        page: 1,
        size: 2,
      },
    });
    const taskCount = await bitbucketAPI.getTaskCount(1);
    expect(taskCount).toEqual(1);
  });
});
