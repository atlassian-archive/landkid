import {
  AdminSettings,
  BannerMessageState,
  ConcurrentBuildState,
  PauseState,
  PriorityBranch,
} from '../../db';
import { StateService } from '../StateService';
import { config } from '../Config';
import { MergeSettings } from '../../types';

jest.mock('../../db/index');
jest.mock('../Config');

describe('StateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('pause > should pause the system', async () => {
    await StateService.pause('test pause message', { aaid: 'test-aaid' } as any);

    expect(PauseState.create).toHaveBeenCalledWith({
      pauserAaid: 'test-aaid',
      reason: 'test pause message',
    });
    expect(PauseState.truncate).toHaveBeenCalled();
  });

  test('unpause > should unpause the system', async () => {
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
    await StateService.updateMaxConcurrentBuild(3, { aaid: 'test-aaid' } as any);

    expect(ConcurrentBuildState.create).toHaveBeenCalledWith({
      adminAaid: 'test-aaid',
      maxConcurrentBuilds: 3,
    });
  });

  describe('getMaxConcurrentBuilds', () => {
    test('should return maxConcurrentBuilds from the table', async () => {
      jest
        .spyOn(ConcurrentBuildState, 'findOne')
        .mockResolvedValueOnce({ maxConcurrentBuilds: 4 } as any);
      const maxConcurrentBuilds = await StateService.getMaxConcurrentBuilds();
      expect(maxConcurrentBuilds).toBe(4);
    });

    test('should return maxConcurrentBuilds from the config when the table is empty', async () => {
      jest.spyOn(ConcurrentBuildState, 'findOne').mockResolvedValueOnce(null);
      const maxConcurrentBuilds = await StateService.getMaxConcurrentBuilds();
      expect(maxConcurrentBuilds).toBe(2);
    });

    test('should return positive maxConcurrentBuilds from the config', async () => {
      jest.spyOn(ConcurrentBuildState, 'findOne').mockResolvedValueOnce({
        maxConcurrentBuilds: -1,
      } as any);
      const maxConcurrentBuilds = await StateService.getMaxConcurrentBuilds();
      expect(maxConcurrentBuilds).toBe(1);
    });
  });

  describe('getAdminSettings', () => {
    let oldMergeSettings: MergeSettings | undefined;
    beforeAll(() => {
      oldMergeSettings = config.mergeSettings;
    });

    afterAll(() => {
      config.mergeSettings = oldMergeSettings;
      config.speculationEngineEnabled = false;
    });

    const getMockMergeSettings = (mergeBlockingEnabled: boolean) =>
      ({
        mergeBlocking: {
          enabled: mergeBlockingEnabled,
        },
      } as any);

    test('should return mergeBlockingEnabled and speculationEngineEnabled as false when the feature is disabled via config (irrespective of the table data)', async () => {
      let settings = await StateService.getAdminSettings();
      expect(settings.mergeBlockingEnabled).toBe(false);
      expect(settings.speculationEngineEnabled).toBe(false);

      config.mergeSettings = getMockMergeSettings(false);
      settings = await StateService.getAdminSettings();
      expect(settings.mergeBlockingEnabled).toBe(false);
      expect(settings.speculationEngineEnabled).toBe(false);

      jest.spyOn(AdminSettings, 'findOne').mockResolvedValueOnce({
        mergeBlockingEnabled: true,
        speculationEngineEnabled: true,
      } as any);

      settings = await StateService.getAdminSettings();
      expect(settings.mergeBlockingEnabled).toBe(false);
      expect(settings.speculationEngineEnabled).toBe(false);
    });

    test('should return mergeBlockingEnabled and speculationEngineEnabled as false when the feature is enabled via config and disabled via UI', async () => {
      config.mergeSettings = getMockMergeSettings(true);
      config.speculationEngineEnabled = true;
      jest.spyOn(AdminSettings, 'findOne').mockResolvedValueOnce({
        mergeBlockingEnabled: false,
        speculationEngineEnabled: false,
      } as any);

      const settings = await StateService.getAdminSettings();
      expect(settings.mergeBlockingEnabled).toBe(false);
      expect(settings.speculationEngineEnabled).toBe(false);
    });

    test('should return mergeBlockingEnabled and speculationEngineEnabled as true when the feature is enabled via config and enabled via UI', async () => {
      config.mergeSettings = getMockMergeSettings(true);
      config.speculationEngineEnabled = true;
      jest.spyOn(AdminSettings, 'findOne').mockResolvedValueOnce({
        mergeBlockingEnabled: true,
        speculationEngineEnabled: true,
      } as any);

      const settings = await StateService.getAdminSettings();
      expect(settings.mergeBlockingEnabled).toBe(true);
      expect(settings.speculationEngineEnabled).toBe(true);
    });
  });

  test('updateAdminSettings > should update admin settings', async () => {
    await StateService.updateAdminSettings(
      { mergeBlockingEnabled: true, speculationEngineEnabled: true },
      {
        aaid: 'test-aaid',
      } as any,
    );

    expect(AdminSettings.create).toHaveBeenCalledWith({
      adminAaid: 'test-aaid',
      mergeBlockingEnabled: true,
      speculationEngineEnabled: true,
    });
  });

  test('getState > should return state', async () => {
    jest.spyOn(StateService, 'getDatesSinceLastFailures').mockResolvedValueOnce(10);

    const state = await StateService.getState();
    expect(state).toEqual(
      expect.objectContaining({
        daysSinceLastFailure: 10,
        pauseState: null,
        bannerMessageState: null,
        maxConcurrentBuilds: 2,
        adminSettings: { mergeBlockingEnabled: false, speculationEngineEnabled: false },
        config: { mergeSettings: {}, speculationEngineEnabled: false },
      }),
    );
  });
  test('get priority branch list', async () => {
    jest.spyOn(PriorityBranch, 'findAll').mockResolvedValueOnce(['test/test-branch'] as any);

    const getPriorityBranches = await StateService.getPriorityBranches();
    expect(getPriorityBranches).toEqual(['test/test-branch']);
  });
  test('should add to priority branch list', async () => {
    jest.spyOn(PriorityBranch, 'create').mockResolvedValueOnce({} as any);

    await StateService.addPriorityBranch('test/test-branch', { aaid: 'test-aaid' } as any);

    expect(PriorityBranch.create).toHaveBeenCalledWith({
      adminAaid: 'test-aaid',
      branchName: 'test/test-branch',
    });
  });
  test('should remove from priority branch list', async () => {
    jest.spyOn(PriorityBranch, 'destroy').mockResolvedValueOnce({} as any);

    await StateService.removePriorityBranch('test/test-branch');
    expect(PriorityBranch.destroy).toHaveBeenCalledWith({
      where: { branchName: 'test/test-branch' },
    });
  });
  test('should update an existing priority branch', async () => {
    jest.spyOn(PriorityBranch, 'update').mockResolvedValueOnce({} as any);

    await StateService.updatePriorityBranch('test-id', 'test/test-branch');
    expect(PriorityBranch.update).toHaveBeenCalledWith(
      { branchName: 'test/test-branch' },
      {
        where: { id: 'test-id' },
      },
    );
  });

  // todo: add tests for getDatesSinceLastFailures
});
