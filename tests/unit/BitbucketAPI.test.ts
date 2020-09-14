import axios from 'axios';
import delay from 'delay';
import { Logger } from '../../src/lib/Logger';
import { BitbucketAPI } from '../../src/bitbucket/BitbucketAPI';

jest.mock('axios');
const mockedAxios = (axios as unknown) as jest.Mocked<typeof axios>;

jest.mock('../../src/bitbucket/BitbucketAuthenticator', () => ({
  bitbucketAuthenticator: {
    getAuthConfig: jest.fn(),
  },
}));

const loggerInfoSpy = jest.spyOn(Logger, 'info');
const loggerErrorSpy = jest.spyOn(Logger, 'error');

jest.mock('delay');
const mockedDelay = delay as jest.Mocked<typeof delay>;

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

describe('mergePullRequest', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('Successful merge first try', async () => {
    mockedAxios.post.mockResolvedValue({ status: 200 });
    await bitbucketAPI.mergePullRequest(landRequestStatus as any);
    expect(loggerInfoSpy).toHaveBeenCalledTimes(2);
  });

  test('Legitimate 4xx merge failure', async () => {
    mockedAxios.post.mockResolvedValue({ status: 400 });
    await expect(bitbucketAPI.mergePullRequest(landRequestStatus as any)).rejects.toThrow();
    expect(loggerInfoSpy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
  });

  test('Retry because of 5xx error and fail all attempts', async () => {
    mockedAxios.post.mockResolvedValue({ status: 500 });
    await expect(bitbucketAPI.mergePullRequest(landRequestStatus as any)).rejects.toThrow();
    expect(loggerInfoSpy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(6);
  });

  test('Succeed on first retry', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 500 }).mockResolvedValueOnce({ status: 200 });
    await bitbucketAPI.mergePullRequest(landRequestStatus as any);
    expect(loggerInfoSpy).toHaveBeenCalledTimes(2);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
  });

  test('Successful timeout merge', async () => {
    mockedAxios.post.mockResolvedValue({ status: 202, headers: { location: '' } });
    mockedAxios.get
      .mockResolvedValueOnce({ data: { task_status: 'PENDING' } })
      .mockResolvedValueOnce({ data: { task_status: 'SUCCESSFUL' } });
    await bitbucketAPI.mergePullRequest(landRequestStatus as any);
    expect(loggerInfoSpy).toHaveBeenCalledTimes(3);
    expect(mockedDelay).toHaveBeenCalledTimes(1);
  });

  test('Failed timeout merge', async () => {
    mockedAxios.post.mockResolvedValue({ status: 202, headers: { location: '' } });
    mockedAxios.get
      .mockResolvedValueOnce({ data: { task_status: 'PENDING' } })
      .mockResolvedValueOnce({ data: { task_status: 'PENDING' } })
      .mockRejectedValueOnce({ response: {} });
    await expect(bitbucketAPI.mergePullRequest(landRequestStatus as any)).rejects.toThrow();
    expect(loggerInfoSpy).toHaveBeenCalledTimes(2);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    expect(mockedDelay).toHaveBeenCalledTimes(2);
  });
});
