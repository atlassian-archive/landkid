import { BitbucketAPI } from '../BitbucketAPI';

jest.mock('../BitbucketAPI');

const MockedClient: any = jest.genMockFromModule('../BitbucketClient');

export const BitbucketClient = jest.fn().mockImplementation((...args) => {
  const client = new MockedClient.BitbucketClient(...args);
  client.getUser.mockImplementation(() => ({}));
  client.createLandBuild.mockImplementation(() => 1);
  // Properties are not auto mocked by jest
  client.bitbucket = new BitbucketAPI({} as any);

  return client;
});
