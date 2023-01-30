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
  priorityBranchList: [
    {
      id: 'test-id',
      branchName: 'test-branch/*',
      adminAaid: 'test-aaid',
      date: '2023-01-25T04:28:07.817Z',
    },
  ],
});
