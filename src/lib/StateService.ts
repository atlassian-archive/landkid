import {
  BannerMessageState,
  ConcurrentBuildState,
  LandRequestStatus,
  PauseState,
  PriorityBranch,
} from '../db';
import { State } from '../types';
import { config } from './Config';

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
    await ConcurrentBuildState.create<ConcurrentBuildState>({
      adminAaid: user.aaid,
      maxConcurrentBuilds,
    });
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
    } catch (e) {
      console.log(`Error adding priority branch: ${e}`);
    }
  }

  static async removePriorityBranch(branchName: string) {
    try {
      await PriorityBranch.destroy({
        where: {
          branchName: branchName,
        },
      });
    } catch (e) {
      console.log(`Error removing priority branch: ${e}`);
    }
  }

  static async getState(): Promise<State> {
    const [
      daysSinceLastFailure,
      pauseState,
      bannerMessageState,
      maxConcurrentBuilds,
      priorityBranchList,
    ] = await Promise.all([
      this.getDatesSinceLastFailures(),
      this.getPauseState(),
      this.getBannerMessageState(),
      this.getMaxConcurrentBuilds(),
      this.getPriorityBranches(),
    ]);

    return {
      daysSinceLastFailure,
      pauseState,
      bannerMessageState,
      maxConcurrentBuilds,
      priorityBranchList,
    };
  }
}
