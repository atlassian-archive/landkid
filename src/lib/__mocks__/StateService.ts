const MockedStateServiceModule: any = jest.genMockFromModule('../StateService');

export const StateService = MockedStateServiceModule.StateService;

StateService.getMaxConcurrentBuilds.mockResolvedValue(2);
StateService.getPauseState.mockResolvedValue(null);
StateService.getBannerMessageState.mockResolvedValue(null);
StateService.getState.mockResolvedValue({
  bannerMessageState: null,
  pauseState: null,
  maxConcurrentBuilds: 2,
  daysSinceLastFailure: 10,
});
