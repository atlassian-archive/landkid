import axios from 'axios';
import delay from 'delay';
import { Logger } from '../../src/lib/Logger';
import { BitbucketAPI } from '../../src/bitbucket/BitbucketAPI';
import { MergeOptions } from '../../src/types';

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

const mergePullRequest = (request: any, opts?: MergeOptions) =>
  bitbucketAPI.mergePullRequest(request, async () => {}, opts);

describe('mergePullRequest', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('Successful merge first try', async () => {
    mockedAxios.post.mockResolvedValue({ status: 200 });
    await mergePullRequest(landRequestStatus);
    expect(loggerInfoSpy).toHaveBeenCalledTimes(2);
  });

  test('Legitimate 4xx merge failure', async () => {
    mockedAxios.post.mockResolvedValue({ status: 400 });
    await expect(mergePullRequest(landRequestStatus)).rejects.toThrow();
    expect(loggerInfoSpy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
  });

  test('Retry because of 5xx error and fail all attempts', async () => {
    mockedAxios.post.mockResolvedValue({ status: 500 });
    await expect(mergePullRequest(landRequestStatus)).rejects.toThrow();
    expect(loggerInfoSpy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(6);
  });

  test('Succeed on first retry', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 500 }).mockResolvedValueOnce({ status: 200 });
    await mergePullRequest(landRequestStatus);
    expect(loggerInfoSpy).toHaveBeenCalledTimes(2);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
  });

  test('Successful timeout merge', async () => {
    mockedAxios.post.mockResolvedValue({ status: 202, headers: { location: '' } });
    mockedAxios.get
      .mockResolvedValueOnce({ data: { task_status: 'PENDING' } })
      .mockResolvedValueOnce({ data: { task_status: 'SUCCESSFUL' } });
    await mergePullRequest(landRequestStatus);
    expect(loggerInfoSpy).toHaveBeenCalledTimes(3);
    expect(mockedDelay).toHaveBeenCalledTimes(1);
  });

  test('Failed timeout merge', async () => {
    mockedAxios.post.mockResolvedValue({ status: 202, headers: { location: '' } });
    mockedAxios.get
      .mockResolvedValueOnce({ data: { task_status: 'PENDING' } })
      .mockResolvedValueOnce({ data: { task_status: 'PENDING' } })
      .mockRejectedValueOnce({ response: {} });
    await expect(mergePullRequest(landRequestStatus)).rejects.toThrow();
    expect(loggerInfoSpy).toHaveBeenCalledTimes(2);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    expect(mockedDelay).toHaveBeenCalledTimes(2);
  });

  test('Skip-ci merge', async () => {
    mockedAxios.post.mockResolvedValue({ status: 200 });
    await mergePullRequest(landRequestStatus, { skipCI: true });
    expect(loggerInfoSpy).toHaveBeenCalledWith(
      'Attempting to merge pull request',
      expect.objectContaining({
        postRequest: expect.objectContaining({
          message: expect.stringContaining('[skip ci]'),
        }),
      }),
    );
  });
});
