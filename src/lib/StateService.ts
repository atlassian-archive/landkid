import { BannerMessageState, ConcurrentBuildState, LandRequestStatus, PauseState } from '../db';
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
    await ConcurrentBuildState.truncate();
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
    const concurrentBuildState = await ConcurrentBuildState.findAll<ConcurrentBuildState>({
      order: [['date', 'DESC']],
    });

    const maxConcurrentBuilds = concurrentBuildState?.length
      ? concurrentBuildState[0].maxConcurrentBuilds
      : config.maxConcurrentBuilds || 1;

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

  static async getState(): Promise<State> {
    const [daysSinceLastFailure, pauseState, bannerMessageState, maxConcurrentBuilds] =
      await Promise.all([
        this.getDatesSinceLastFailures(),
        this.getPauseState(),
        this.getBannerMessageState(),
        this.getMaxConcurrentBuilds(),
      ]);

    return {
      daysSinceLastFailure,
      pauseState,
      bannerMessageState,
      maxConcurrentBuilds,
    };
  }
}
