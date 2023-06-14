import {
  AdminSettings,
  BannerMessageState,
  ConcurrentBuildState,
  LandRequestStatus,
  PauseState,
  PriorityBranch,
} from '../db';
import { State } from '../types';
import { config } from './Config';
import { Logger } from './Logger';

export class StateService {
  constructor() {}

  static async pause(reason: string, user: ISessionUser) {
    await this.unpause();
    await PauseState.create<PauseState>({
      pauserAaid: user.aaid,
      reason,
    });
  }

  static async unpause() {
    await PauseState.truncate();
  }

  static async getPauseState(): Promise<IPauseState | null> {
    const state = await PauseState.findOne<PauseState>();
    return state ? state.get() : null;
  }

  static async addBannerMessage(
    message: string,
    messageType: IMessageState['messageType'],
    user: ISessionUser,
  ) {
    await StateService.removeBannerMessage();
    await BannerMessageState.create<BannerMessageState>({
      senderAaid: user.aaid,
      message,
      messageType,
    });
  }

  static async removeBannerMessage() {
    await BannerMessageState.truncate();
  }

  static async getBannerMessageState(): Promise<IMessageState | null> {
    const state = await BannerMessageState.findOne<BannerMessageState>();
    return state ? state.get() : null;
  }

  static async updateMaxConcurrentBuild(maxConcurrentBuilds: number, user: ISessionUser) {
    try {
      await ConcurrentBuildState.create<ConcurrentBuildState>({
        adminAaid: user.aaid,
        maxConcurrentBuilds,
      });
      return true;
    } catch (error) {
      Logger.error('Error updating max concurrency', {
        namespace: 'lib:stateService:updateMaxConcurrentBuild',
        maxConcurrentBuilds,
        error,
        errorString: String(error),
        errorStack: String(error.stack),
      });
      return false;
    }
  }

  /**
   * Use the latest ConcurrentBuildState or fallback to system configuration or 1.
   * @returns maxConcurrentBuilds
   */
  static async getMaxConcurrentBuilds(): Promise<number> {
    const lastConcurrentBuildState = await ConcurrentBuildState.findOne<ConcurrentBuildState>({
      order: [['date', 'DESC']],
    });

    const maxConcurrentBuilds =
      lastConcurrentBuildState?.maxConcurrentBuilds || config.maxConcurrentBuilds || 1;

    return maxConcurrentBuilds > 0 ? maxConcurrentBuilds : 1;
  }

  static async getDatesSinceLastFailures(): Promise<number> {
    const lastFailure = await LandRequestStatus.findOne<LandRequestStatus>({
      where: {
        state: {
          $in: ['fail', 'aborted'],
        },
      },
      order: [['date', 'DESC']],
    });
    if (!lastFailure) return -1;
    return Math.floor((Date.now() - lastFailure.date.getTime()) / (1000 * 60 * 60 * 24));
  }
  static async getPriorityBranches(): Promise<IPriorityBranch[]> {
    const state = await PriorityBranch.findAll();
    return state;
  }

  static async addPriorityBranch(branchName: string, user: ISessionUser) {
    try {
      await PriorityBranch.create<PriorityBranch>({
        adminAaid: user.aaid,
        branchName,
      });
      return true;
    } catch (error) {
      Logger.error('Error adding priority branch', {
        namespace: 'lib:stateService:addPriorityBranch',
        branchName,
        error,
        errorString: String(error),
        errorStack: String(error.stack),
      });
      return false;
    }
  }

  static async removePriorityBranch(branchName: string) {
    try {
      await PriorityBranch.destroy({
        where: {
          branchName: branchName,
        },
      });
      return true;
    } catch (error) {
      Logger.error('Error removing priority branch', {
        namespace: 'lib:stateService:removePriorityBranch',
        branchName,
        error,
        errorString: String(error),
        errorStack: String(error.stack),
      });
      return false;
    }
  }

  // Used for end to end testing
  static async removeAllPriorityBranches() {
    try {
      await PriorityBranch.truncate();
      return true;
    } catch (error) {
      Logger.error('Error removing all priority branches', {
        namespace: 'lib:stateService:removeAllPriorityBranches',
        error,
        errorString: String(error),
        errorStack: String(error.stack),
      });
      return false;
    }
  }

  static async updatePriorityBranch(id: string, branchName: string) {
    try {
      await PriorityBranch.update(
        { branchName },
        {
          where: {
            id: id,
          },
        },
      );
      return true;
    } catch (error) {
      Logger.error('Error updating priority branch', {
        namespace: 'lib:stateService:updatePriorityBranch',
        branchName,
        error,
        errorString: String(error),
        errorStack: String(error.stack),
      });
      return false;
    }
  }

  static async getAdminSettings(): Promise<IAdminSettings> {
    const defaultMergeBlockingEnabled = !!config.mergeSettings?.mergeBlocking?.enabled;
    const defaultSpeculationEngineEnabled = !!config.queueSettings?.speculationEngineEnabled;
    const settings = await AdminSettings.findOne<AdminSettings>({
      order: [['date', 'DESC']],
    });

    if (!settings) {
      return {
        mergeBlockingEnabled: defaultMergeBlockingEnabled,
        speculationEngineEnabled: defaultSpeculationEngineEnabled,
      };
    }

    return {
      mergeBlockingEnabled: defaultMergeBlockingEnabled ? settings.mergeBlockingEnabled : false,
      speculationEngineEnabled: defaultSpeculationEngineEnabled
        ? settings.speculationEngineEnabled
        : false,
    };
  }

  static async updateAdminSettings(
    settings: Omit<IAdminSettings, 'adminAaid'>,
    user: ISessionUser,
  ) {
    try {
      await AdminSettings.create<AdminSettings>({
        adminAaid: user.aaid,
        mergeBlockingEnabled: settings.mergeBlockingEnabled,
        speculationEngineEnabled: settings.speculationEngineEnabled,
      });
      return true;
    } catch (error) {
      Logger.error('Error updating admin settings', {
        namespace: 'lib:stateService:updateAdminSettings',
        settings,
        error,
        errorString: String(error),
        errorStack: String(error.stack),
      });
      return false;
    }
  }

  static async getState(): Promise<State> {
    const [
      daysSinceLastFailure,
      pauseState,
      bannerMessageState,
      maxConcurrentBuilds,
      priorityBranchList,
      adminSettings,
    ] = await Promise.all([
      this.getDatesSinceLastFailures(),
      this.getPauseState(),
      this.getBannerMessageState(),
      this.getMaxConcurrentBuilds(),
      this.getPriorityBranches(),
      this.getAdminSettings(),
    ]);

    return {
      daysSinceLastFailure,
      pauseState,
      bannerMessageState,
      maxConcurrentBuilds,
      priorityBranchList,
      adminSettings,
      config: {
        mergeSettings: config.mergeSettings,
        speculationEngineEnabled: !!config.queueSettings?.speculationEngineEnabled,
      },
    };
  }
}
