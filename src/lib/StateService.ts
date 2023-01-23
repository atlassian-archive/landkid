import { BannerMessageState, ConcurrentBuildState, PauseState } from '../db';
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

  static async getMaxConcurrentBuilds(): Promise<number> {
    const state = await ConcurrentBuildState.findOne<ConcurrentBuildState>();
    const maxConcurrentBuilds = state?.get().maxConcurrentBuilds || config.maxConcurrentBuilds;

    return maxConcurrentBuilds > 0 ? maxConcurrentBuilds : 1;
  }
}
