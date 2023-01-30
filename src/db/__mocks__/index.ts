const MockedDb: any = jest.genMockFromModule('../index');

export const Installation = MockedDb.Installation;
export const LandRequest = jest.fn((props) => {
  const req = new MockedDb.LandRequest(props);
  req.save.mockImplementation(() => ({ id: '1' }));
  Object.assign(req, {
    ...props,
    // Jest does not auto mock properties that aren't on the prototype
    getStatus: jest.fn(),
    setStatus: jest.fn(),
    getDependencies: jest.fn(() => []),
    getFailedDependencies: jest.fn(() => []),
    updatePriority: jest.fn(),
    incrementPriority: jest.fn(),
    decrementPriority: jest.fn(),
    getQueuedDate: jest.fn(),
  });
  return req;
});
export const LandRequestStatus = jest.fn((props) => {
  const req = new MockedDb.LandRequestStatus(props);
  Object.assign(req, { ...props });
  return req;
});
export const PullRequest = jest.fn((props) => {
  const req = new MockedDb.PullRequest(props);
  Object.assign(req, { ...props });
  return req;
});
export const Permission = MockedDb.Permission;
export const UserNote = MockedDb.UserNote;
export const PauseState = MockedDb.PauseState;
export const BannerMessageState = MockedDb.BannerMessageState;
export const ConcurrentBuildState = MockedDb.ConcurrentBuildState;
export const PriorityBranch = MockedDb.PriorityBranch;
export const initializeSequelize = MockedDb.initializeSequelize;
