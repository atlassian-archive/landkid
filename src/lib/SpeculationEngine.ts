import { LandRequest, LandRequestStatus } from '../db';
import { Logger } from './Logger';
import { StateService } from './StateService';

export class SpeculationEngine {
  constructor() {}

  static async getAvailableSlots(running: LandRequestStatus[]): Promise<number> {
    const maxConcurrentBuilds = await StateService.getMaxConcurrentBuilds();
    return maxConcurrentBuilds - running.filter(({ state }) => state === 'running').length;
  }

  static getPositionInQueue(queue: LandRequestStatus[], landRequestStatus: LandRequestStatus) {
    return queue.findIndex(({ id }) => id === landRequestStatus.id);
  }

  // get the request with the lowest impact by comparing the current request with the next requests behind in the queue
  static getLowestImpactedRequestStatus(
    queue: LandRequestStatus[],
    position: number,
    availableSlots: number,
  ): LandRequestStatus {
    // the number of queue requests we want to compare the impact with should equal to the number of available slots
    const nextqueueRequestStatus = queue.slice(0, availableSlots);

    // sort the impact of next queue requests so that we can compare the lowest request's impact with the current request's impact
    const sortedRequestStatuses = nextqueueRequestStatus.sort(
      (reqStatusA, reqStatusB) => reqStatusA.request.impact - reqStatusB.request.impact,
    );

    Logger.info('Impact retrieved for next queue requests:', {
      namespace: 'lib:speculationEngine:getImpact',
      pullRequestId: queue[position].request.pullRequestId,
      impact: sortedRequestStatuses,
      lowestImpactRequest: sortedRequestStatuses[0],
      sortedRequestStatuses: sortedRequestStatuses.map(
        ({ request }) => request.pullRequestId + ' ' + request.impact,
      ),
    });

    // return the lowest impact request
    return sortedRequestStatuses[0];
  }

  /**
   *
   *
   * Determines whether the current land request should be reordered with requests behind it in the queue.
   * Note that this is done in a way such that the current land request will only be reordered if it can simultaneously enter the running slots as the request(s)
   * that it is reordered with. This ensures that we don't de-prioritise a PR and extend the amount of time it is in the queue.
   *
   * A request will be reordered if it meets the following conditions:
   *  1. The speculationEngineEnabled toggle is enabled from admin settings
   *  2. There are at least 2 available free slots
   *  3. Size of the queue is greater than 1
   *  4. Impact of the current request is not the lowest impact compared with the requests behind it in the queue
   *
   * @param running
   * @param queue
   * @param currentLandRequestStatus
   * @returns true if requests needs to be reordered.
   *
   */
  static async reorderRequest(
    running: LandRequestStatus[],
    queue: LandRequestStatus[],
    currentLandRequestStatus: LandRequestStatus,
  ): Promise<boolean> {
    const { speculationEngineEnabled } = await StateService.getAdminSettings();
    if (!speculationEngineEnabled) {
      return false;
    }

    const availableSlots = await this.getAvailableSlots(running);
    const landRequest: LandRequest = currentLandRequestStatus.request;
    const positionInQueue = this.getPositionInQueue(queue, currentLandRequestStatus);
    const logMessage = (message: string, extraProps = {}) =>
      Logger.info(message, {
        namespace: 'lib:speculationEngine:reorderRequest',
        pullRequestId: landRequest.pullRequestId,
        ...extraProps,
      });

    logMessage('Speculation engine details', {
      availableSlots,
      positionInQueue,
      queue: queue.map(({ request }) => request.pullRequestId),
    });

    if (availableSlots < 2 || queue.length < 2 || positionInQueue >= availableSlots - 1) {
      logMessage(
        'Skipping reorder request. Speculation engine conditions to reorder current request are not met.',
      );
      return false;
    }

    logMessage('Attempting to reorder PR based on impact');
    const lowestImpact = this.getLowestImpactedRequestStatus(
      queue,
      positionInQueue,
      availableSlots,
    );

    // if the curent request has the lowest impact, we do not need to reorder this request.
    if (queue[positionInQueue].request.id === lowestImpact.request.id) {
      logMessage('PR will not be reordered since the current request is the lowest impact');
      return false;
    }
    logMessage('PR will be reordered since the current request does not have the lowest impact');
    return true;
  }
}
