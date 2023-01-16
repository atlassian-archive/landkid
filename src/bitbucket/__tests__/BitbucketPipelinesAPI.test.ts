import axios from 'axios';
import { BitbucketPipelinesAPI } from '../BitbucketPipelinesAPI';

jest.mock('axios');
const mockedAxios = axios as unknown as jest.Mocked<typeof axios>;

jest.mock('../BitbucketAuthenticator', () => ({
  bitbucketAuthenticator: {
    getAuthConfig: () => Promise.resolve({}),
  },
}));

const bitbucketPipelineAPI = new BitbucketPipelinesAPI({
  repoName: 'repo',
  repoOwner: 'owner',
});

describe('BitbucketPipelinesAPI', () => {
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
});
