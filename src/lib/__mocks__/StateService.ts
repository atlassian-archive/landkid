const MockedStateServiceModule: any = jest.genMockFromModule('../StateService');

export const StateService = MockedStateServiceModule.StateService;

StateService.getMaxConcurrentBuilds.mockResolvedValue(2);
StateService.getPauseState.mockResolvedValue(null);
StateService.getBannerMessageState.mockResolvedValue(null);
