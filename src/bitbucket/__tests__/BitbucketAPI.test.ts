import axios from 'axios';
import { Logger } from '../../lib/Logger';
import { BitbucketAPI } from '../BitbucketAPI';
import { MergeOptions } from '../../types';

jest.mock('axios');
const mockedAxios = axios as unknown as jest.Mocked<typeof axios>;

jest.mock('delay');

jest.mock('../BitbucketAuthenticator', () => ({
  bitbucketAuthenticator: {
    getAuthConfig: () => Promise.resolve({}),
  },
}));

const loggerInfoSpy = jest.spyOn(Logger, 'info');

const landRequestStatus = {
  id: '1',
  request: {
    pullRequestId: 1,
    pullRequest: {
      title: 'Introduce bug I can later fix for karma',
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
    expect(await mergePullRequest(landRequestStatus)).toStrictEqual({
      status: BitbucketAPI.SUCCESS,
    });
  });

  test('4xx merge failure', async () => {
    mockedAxios.post.mockResolvedValue({ status: 400 });
    expect(await mergePullRequest(landRequestStatus)).toStrictEqual({
      status: BitbucketAPI.FAILED,
      reason: undefined,
    });
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  test('5xx merge failure', async () => {
    mockedAxios.post.mockResolvedValue({ status: 500 });
    expect(await mergePullRequest(landRequestStatus)).toStrictEqual({
      status: BitbucketAPI.FAILED,
      reason: undefined,
    });
  });

  test('merge failure with message', async () => {
    mockedAxios.post.mockResolvedValue({ status: 500, data: { error: { message: 'reason' } } });
    expect(await mergePullRequest(landRequestStatus)).toStrictEqual({
      status: BitbucketAPI.FAILED,
      reason: { error: { message: 'reason' } },
    });
  });

  test('Merge failure with retry attempts', async () => {
    const spy = jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => fn());
    mockedAxios.post.mockResolvedValue({ status: 400 });
    const result = await mergePullRequest(landRequestStatus, { numRetries: 2 });
    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    expect(global.setTimeout).toHaveBeenCalledTimes(2);
    expect(result).toStrictEqual({
      status: BitbucketAPI.FAILED,
      reason: undefined,
    });
    spy.mockRestore();
  });

  test('merge failure with message containing fields with merge_checks ', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 400,
      data: {
        error: {
          fields: {
            merge_checks: ['At least 1 approval', 'No in progress builds on last commit'],
          },
          message: '2 failed merge checks',
        },
      },
    });
    expect(await mergePullRequest(landRequestStatus)).toStrictEqual({
      status: BitbucketAPI.FAILED,
      reason: {
        error: {
          fields: {
            merge_checks: ['At least 1 approval', 'No in progress builds on last commit'],
          },
          message: '2 failed merge checks',
        },
      },
    });
  });
  test('Successful timeout merge', async () => {
    mockedAxios.post.mockResolvedValue({ status: 202, headers: { location: '' } });
    mockedAxios.get
      .mockResolvedValueOnce({ data: { task_status: 'PENDING' } })
      .mockResolvedValueOnce({ data: { task_status: 'SUCCESS' } });
    expect(await mergePullRequest(landRequestStatus)).toStrictEqual({
      status: BitbucketAPI.SUCCESS,
    });
  });

  test('Failed timeout merge', async () => {
    mockedAxios.post.mockResolvedValue({ status: 202, headers: { location: '' } });
    mockedAxios.get
      .mockResolvedValueOnce({ data: { task_status: 'PENDING' } })
      .mockResolvedValueOnce({ data: { task_status: 'PENDING' } })
      .mockRejectedValueOnce({ response: {} });
    expect(await mergePullRequest(landRequestStatus)).toEqual({ status: BitbucketAPI.FAILED });
  });

  test('Timeout merge polling', async () => {
    mockedAxios.post.mockResolvedValue({ status: 202, headers: { location: '' } });
    mockedAxios.get.mockResolvedValue({ data: { task_status: 'PENDING' } });
    expect(await mergePullRequest(landRequestStatus)).toEqual({ status: BitbucketAPI.TIMEOUT });
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

  test('when merge strategy is merge commit, its passed correctly', async () => {
    mockedAxios.post.mockResolvedValue({ status: 200 });
    const data = JSON.stringify({
      close_source_branch: true,
      message: `Merged pull request #${landRequestStatus.request.pullRequestId} via Landkid: ${landRequestStatus.request.pullRequest.title}`,
      merge_strategy: 'merge_commit',
    });
    await mergePullRequest(landRequestStatus, { mergeStrategy: 'merge-commit' });
    expect(mockedAxios.post).toBeCalledWith(expect.any(String), data, {});
  });

  test('when merge strategy is squash, its passed correctly', async () => {
    mockedAxios.post.mockResolvedValue({ status: 200 });
    const data = JSON.stringify({
      close_source_branch: true,
      message: `Merged pull request #${landRequestStatus.request.pullRequestId} via Landkid: ${landRequestStatus.request.pullRequest.title}`,
      merge_strategy: 'squash',
    });
    await mergePullRequest(landRequestStatus, { mergeStrategy: 'squash' });
    expect(mockedAxios.post).toBeCalledWith(expect.any(String), data, {});
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

describe('getPullRequestPriority', () => {
  test('when build status includes "landkid-priority" then should return priority ', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        values: [
          {
            name: 'landkid-priority',
            description: 'HIGH',
          },
        ],
      },
    });

    expect(await bitbucketAPI.getPullRequestPriority('commit-foo')).toBe('HIGH');
  });

  test('when build status doesn"t include "landkid-priority" then should return default priority ', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        values: [],
      },
    });

    expect(await bitbucketAPI.getPullRequestPriority('commit-foo')).toBe('LOW');
  });
});
