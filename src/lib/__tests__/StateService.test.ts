import { BannerMessageState, ConcurrentBuildState, PauseState } from '../../db';
import { StateService } from '../StateService';

jest.mock('../../db/index');
jest.mock('../Config');

describe('StateService', () => {
  test('pause > should pause the system', async () => {
    jest.spyOn(PauseState, 'create').mockResolvedValueOnce({} as any);
    jest.spyOn(PauseState, 'truncate').mockResolvedValueOnce({} as any);

    await StateService.pause('test pause message', { aaid: 'test-aaid' } as any);

    expect(PauseState.create).toHaveBeenCalledWith({
      pauserAaid: 'test-aaid',
      reason: 'test pause message',
    });
    expect(PauseState.truncate).toHaveBeenCalled();
  });

  test('unpause > should unpause the system', async () => {
    jest.spyOn(PauseState, 'truncate').mockResolvedValueOnce({} as any);

    await StateService.unpause();
    expect(PauseState.truncate).toHaveBeenCalled();
  });

  test('getPauseState > should return the pause state of the sytem', async () => {
    jest.spyOn(PauseState, 'findOne').mockResolvedValueOnce(null);
    let state = await StateService.getPauseState();
    expect(state).toBeNull();

    jest.spyOn(PauseState, 'findOne').mockResolvedValueOnce({ get: () => 'pause-state' } as any);
    state = await StateService.getPauseState();
    expect(state).toBe('pause-state');
  });

  test('addBannerMessage > should add entry to the banner message table ', async () => {
    jest.spyOn(BannerMessageState, 'create').mockResolvedValueOnce({} as any);
    jest.spyOn(BannerMessageState, 'truncate').mockResolvedValueOnce({} as any);

    await StateService.addBannerMessage('test banner message', 'error', {
      aaid: 'test-aaid',
    } as any);

    expect(BannerMessageState.create).toHaveBeenCalledWith({
      senderAaid: 'test-aaid',
      message: 'test banner message',
      messageType: 'error',
    });
    expect(BannerMessageState.truncate).toHaveBeenCalled();
  });

  test('removeBannerMessage > should remove the banner message ', async () => {
    jest.spyOn(BannerMessageState, 'truncate').mockResolvedValueOnce({} as any);

    await StateService.removeBannerMessage();
    expect(BannerMessageState.truncate).toHaveBeenCalled();
  });

  test('getBannerMessageState > should return the banner message ', async () => {
    jest.spyOn(BannerMessageState, 'findOne').mockResolvedValueOnce(null);
    let state = await StateService.getBannerMessageState();
    expect(state).toBeNull();

    jest
      .spyOn(BannerMessageState, 'findOne')
      .mockResolvedValueOnce({ get: () => 'banner-message-state' } as any);
    state = await StateService.getBannerMessageState();
    expect(state).toBe('banner-message-state');
  });

  test('updateMaxConcurrentBuild > should update the max concurrent builds', async () => {
    jest.spyOn(ConcurrentBuildState, 'create').mockResolvedValueOnce({} as any);
    jest.spyOn(ConcurrentBuildState, 'truncate').mockResolvedValueOnce({} as any);

    await StateService.updateMaxConcurrentBuild(3, { aaid: 'test-aaid' } as any);

    expect(ConcurrentBuildState.create).toHaveBeenCalledWith({
      adminAaid: 'test-aaid',
      maxConcurrentBuilds: 3,
    });
    expect(ConcurrentBuildState.truncate).toHaveBeenCalled();
  });

  describe('getMaxConcurrentBuilds', () => {
    test('should return maxConcurrentBuilds from the ConcurrentBuildState table', async () => {
      jest.spyOn(ConcurrentBuildState, 'findOne').mockResolvedValueOnce({
        get: () => ({
          maxConcurrentBuilds: 3,
        }),
      } as any);
      const maxConcurrentBuilds = await StateService.getMaxConcurrentBuilds();
      expect(maxConcurrentBuilds).toBe(3);
    });
    test('should return maxConcurrentBuilds from the config', async () => {
      jest.spyOn(ConcurrentBuildState, 'findOne').mockResolvedValueOnce(null);
      const maxConcurrentBuilds = await StateService.getMaxConcurrentBuilds();
      expect(maxConcurrentBuilds).toBe(2);
    });
  });
});
