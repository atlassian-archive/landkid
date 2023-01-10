jest.mock('../utils/locker');

const MockedRunnerModule: any = jest.genMockFromModule('../Runner');

export const Runner = jest.fn().mockImplementation((...args) => {
  const runner = new MockedRunnerModule.Runner(...args);
  // Properties are not auto mocked by jest
  runner.getMaxConcurrentBuilds = jest.fn();
  runner.getQueue = jest.fn();
  runner.getRunning = jest.fn();
  runner.getWaitingAndQueued = jest.fn();
  runner.moveFromQueueToRunning = jest.fn();
  runner.moveFromAwaitingMerge = jest.fn();
  runner.failDueToDependency = jest.fn();
  runner.onStatusUpdate = jest.fn();
  runner.cancelRunningBuild = jest.fn();
  runner.pause = jest.fn();
  runner.unpause = jest.fn();
  runner.getPauseState = jest.fn();
  runner.addBannerMessage = jest.fn();
  runner.removeBannerMessage = jest.fn();
  runner.getBannerMessageState = jest.fn();
  runner.enqueue = jest.fn();
  runner.addToWaitingToLand = jest.fn();
  runner.moveFromWaitingToQueued = jest.fn();
  runner.removeLandRequestFromQueue = jest.fn();
  runner.updateLandRequestPriority = jest.fn();
  runner.checkWaitingLandRequests = jest.fn();
  runner.getStatusesForLandRequests = jest.fn();
  runner.getLandRequestStateByPRId = jest.fn();
  runner.getHistory = jest.fn();
  runner.getInstallationIfExists = jest.fn();
  runner.deleteInstallation = jest.fn();
  runner.clearHistory = jest.fn();
  runner.clearLandWhenAbleQueue = jest.fn();
  runner.getState = jest.fn();

  return runner;
});
