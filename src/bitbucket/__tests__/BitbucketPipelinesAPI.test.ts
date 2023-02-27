import axios from 'axios';
import { BitbucketPipelinesAPI } from '../BitbucketPipelinesAPI';
import { bitbucketAuthenticator } from '../BitbucketAuthenticator';
import { Logger } from '../../lib/Logger';

jest.mock('axios');
const mockedAxios = axios as unknown as jest.Mocked<typeof axios>;

const bitbucketPipelineAPI = new BitbucketPipelinesAPI({
  repoName: 'repo',
  repoOwner: 'owner',
});

describe('BitbucketPipelinesAPI', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(bitbucketAuthenticator, 'getAuthConfig').mockResolvedValue({});
  });

  test(`getLandBuild > should return land build data`, async () => {
    const response = {
      data: {
        state: {
          result: {
            name: 'FAILED',
          },
        },
      },
    };
    mockedAxios.get.mockResolvedValue(response);

    expect(await bitbucketPipelineAPI.getLandBuild(123)).toBe(response.data);
    expect(mockedAxios.get).toBeCalledWith(
      'https://api.bitbucket.org/2.0/repositories/owner/repo/pipelines/123',
      {},
    );
  });

  describe('getPipelines', () => {
    let loggerSpy: jest.SpyInstance;
    beforeEach(() => {
      loggerSpy = jest.spyOn(Logger, 'error');
    });
    test('should return successful response without retries', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: 'data' });
      const response = await bitbucketPipelineAPI.getPipelines({
        pagelen: 30,
      });
      expect(response).toBe('data');
    });

    test('should return successful response with retries', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('error'))
        .mockResolvedValueOnce({ data: 'data' });
      const response = await bitbucketPipelineAPI.getPipelines({
        pagelen: 30,
      });
      expect(loggerSpy).toBeCalledTimes(1);
      expect(response).toBe('data');
    });

    test('should fail after all retries', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('error'))
        .mockRejectedValueOnce(new Error('error'));
      const response = await bitbucketPipelineAPI.getPipelines(
        {
          pagelen: 30,
        },
        2,
      );
      expect(loggerSpy).toBeCalledTimes(2);
      expect(response).toBeUndefined();
    });
  });
});
