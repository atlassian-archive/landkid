import { LandRequest, LandRequestStatus } from '../db';
import { Logger } from './Logger';
import { StateService } from './StateService';

export class SepculationEngine {
  constructor() {}

  static async getAvailableSlots(running: LandRequestStatus[]): Promise<number> {
    const maxConcurrentBuilds = await StateService.getMaxConcurrentBuilds();
    return maxConcurrentBuilds - running.filter(({ state }) => state === 'running').length;
  }

  static async positionInQueue(queued: LandRequestStatus[], landRequestStatus: LandRequestStatus) {
    return queued.findIndex(({ id }) => id === landRequestStatus.id);
  }

  static async getImpact(queued: LandRequestStatus[], position: number) {
    const currentRequestStatus = queued[position];
    const nextRequestStatus = queued[position + 1];

    Logger.info('Calculating impact of', {
      namespace: 'lib:speculationEngine:getImpact',
      currentRequestStatus,
      nextRequestStatus,
    });

    return {
      currentImpact: Math.round(Math.random() * 100),
      nextImpact: Math.round(Math.random() * 100),
    };
  }

  /**
   *
   * Attempts to re-order if
   *      1. speculationEngineEnabled feature is enabled
   *      2. available free slots are atleast 2
   *      3. Position of current requests in the queue compared to numner of slots.
   *         for example if 2 slots are available consider re-ordering 1st request from the queue
   *                     if 3 slots are available consider re-ordering 1st and 2nd request from the queue
   *      4. Size of queue is more than 1
   *      5. Impact of the current request
   *
   * @param running
   * @param queued
   * @param currentlandRequestStatus
   * @returns true if requests needs to be re-ordered.
   *
   */
  static async reOrderRequest(
    running: LandRequestStatus[],
    queued: LandRequestStatus[],
    currentlandRequestStatus: LandRequestStatus,
  ): Promise<boolean> {
    const { speculationEngineEnabled } = await StateService.getAdminSettings();
    if (!speculationEngineEnabled) {
      return false;
    }

    const availableSlots = await this.getAvailableSlots(running);
    const landRequest: LandRequest = currentlandRequestStatus.request;
    const position = await this.positionInQueue(queued, currentlandRequestStatus);
    if (availableSlots < 2 || position == availableSlots - 1) {
      return false;
    }

    Logger.info('Attempting to re-order PR based on impact', {
      namespace: 'lib:speculationEngine:reOrderRequest',
      landRequestId: landRequest.id,
      pullRequestId: landRequest.pullRequestId,
    });

    const { currentImpact, nextImpact } = await this.getImpact(queued, position);
    if (currentImpact > nextImpact) {
      // re-order as current impact is greater than next impact
      Logger.info('PR re-ordered based on speculation', {
        namespace: 'lib:speculationEngine:reOrderRequest',
        landRequestId: landRequest.id,
        pullRequestId: landRequest.pullRequestId,
        currentImpact,
        nextImpact,
      });
      return true;
    }

    return false;
  }
}
