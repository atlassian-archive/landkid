import { LandRequest, LandRequestStatus } from '../db';
import { Logger } from './Logger';
import { StateService } from './StateService';

export class SpeculationEngine {
  constructor() {}

  static async getAvailableSlots(running: LandRequestStatus[]): Promise<number> {
    const maxConcurrentBuilds = await StateService.getMaxConcurrentBuilds();
    return maxConcurrentBuilds - running.filter(({ state }) => state === 'running').length;
  }

  static async positionInQueue(queued: LandRequestStatus[], landRequestStatus: LandRequestStatus) {
    return queued.findIndex(({ id }) => id === landRequestStatus.id);
  }

  static async getImpact(queued: LandRequestStatus[], position: number, availableSlots: number) {
    // Compare current request with availableSlots - 1 number of next queue items
    const queuedRequestsLength = position + availableSlots - 1;
    const nextQueuedRequestStatus = queued.slice(position, queuedRequestsLength + 1);

    const queuedRequestImpacts = nextQueuedRequestStatus.map(
      (requestStatus) => requestStatus.request.impact,
    );

    Logger.info('Impact retrieved for next queued requests:', {
      namespace: 'lib:speculationEngine:getImpact',
      pullRequestId: queued[position].request.pullRequestId,
      impact: queuedRequestImpacts,
    });

    return queuedRequestImpacts;
  }

  /**
   *
   * Attempts to re-order if
   *      1. speculationEngineEnabled feature is enabled
   *      2. available free slots are atleast 2
   *      3. Position of current requests in the queue compared to number of slots.
   *         for example if 2 slots are available consider re-ordering 1st request from the queue
   *                     if 3 slots are available consider re-ordering 1st and 2nd request from the queue
   *      4. Size of queue is more than 1
   *      5. Impact of the current request compared to the next requests in queue
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
    const logMessage = (message: string, extraProps = {}) =>
      Logger.info(message, {
        namespace: 'lib:speculationEngine:reOrderRequest',
        pullRequestId: landRequest.pullRequestId,
        ...extraProps,
      });

    logMessage('Speculation engine details', {
      availableSlots,
      position,
      queued: queued.map(({ request }) => request.pullRequestId),
    });

    if (availableSlots < 2 || queued.length < 2 || position >= availableSlots - 1) {
      logMessage(
        'Skipping re-order request. Speculation engine conditions to re-order PRs are not met.',
      );
      return false;
    }

    logMessage('Attempting to re-order PR based on impact');
    // getImpactQueuedRequests will return an array of impact values from the current request and the next number (available slots - 1) of requests in the queue
    const getImpactQueuedRequests = await this.getImpact(queued, position, availableSlots);
    const getImpactQueuedRequestsSorted = [...getImpactQueuedRequests].sort();

    //if our current request has a lower impact than the next queued requests, then we should reorder this request
    if (getImpactQueuedRequests[position] !== getImpactQueuedRequestsSorted[position]) {
      // re-order as current impact is greater than next impact
      logMessage('PR re-ordered based on speculation');
      return true;
    }
    // if reordering is not required, we continue with the current request
    logMessage('PR not re-ordered based on speculation');
    return false;
  }
}
