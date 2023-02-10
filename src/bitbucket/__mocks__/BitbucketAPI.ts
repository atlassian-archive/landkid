const MockedApi: any = jest.genMockFromModule('../BitbucketAPI');

export const BitbucketAPI = jest.fn().mockImplementation((...args) => {
  const api = new MockedApi.BitbucketAPI(...args);
  // Properties are not auto mocked by jest
  // TODO: Convert class to use standard class methods so they are auto mocked
  api.mergePullRequest = jest.fn();
  api.cancelMergePolling = jest.fn();
  api.getPullRequest = jest.fn();
  api.pullRequestHasConflicts = jest.fn();
  api.getPullRequestBuildStatuses = jest.fn();
  api.getPullRequestPriority = jest.fn();
  api.getUser = jest.fn();
  api.getRepository = jest.fn();

  return api;
});
// Mock static properties
(BitbucketAPI as any).SUCCESS = 'success';
(BitbucketAPI as any).FAILED = 'failed';
(BitbucketAPI as any).ABORTED = 'aborted';
(BitbucketAPI as any).TIMEOUT = 'timeout';
