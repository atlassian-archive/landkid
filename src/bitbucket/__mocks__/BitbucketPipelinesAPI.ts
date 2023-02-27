const MockedApi: any = jest.genMockFromModule('../BitbucketPipelinesAPI');

export const BitbucketPipelinesAPI = jest.fn().mockImplementation((...args) => {
  const api = new MockedApi.BitbucketPipelinesAPI(...args);

  // Properties are not auto mocked by jest
  // TODO: Convert class to use standard class methods so they are auto mocked
  api.processStatusWebhook = jest.fn();
  api.createLandBuild = jest.fn();
  api.stopLandBuild = jest.fn();
  api.getPipelines = jest.fn();
  api.getLandBuild = jest.fn();

  return api;
});
