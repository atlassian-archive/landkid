import { LandRequestStatus, LandRequest, PullRequest } from '../db';

export class LandRequestQueue {
  public getStatusesForWaitingRequests = async (): Promise<LandRequestStatus[]> => {
    return await LandRequestStatus.findAll<LandRequestStatus>({
      where: {
        isLatest: true,
        state: 'will-queue-when-ready',
      },
      order: [['date', 'ASC']],
      include: [
        {
          model: LandRequest,
          include: [PullRequest],
        },
      ],
    });
  };

  // returns the list of queued, running and awaiting-merge items as these are the actual "queue" per se
  // all the status' we display on the frontend
  public getQueue = async (): Promise<LandRequestStatus[]> => {
    return await LandRequestStatus.findAll<LandRequestStatus>({
      where: {
        isLatest: true,
        state: {
          $in: ['queued', 'running', 'awaiting-merge'],
        },
      },
      order: [['date', 'ASC']],
      include: [
        {
          model: LandRequest,
          include: [PullRequest],
        },
      ],
    });
  };

  // returns builds that are running or awaiting-merge, used to find the dependencies of a request
  // that is about to move to running state
  public getRunning = async (): Promise<LandRequestStatus[]> => {
    return await LandRequestStatus.findAll<LandRequestStatus>({
      where: {
        isLatest: true,
        state: {
          $in: ['running', 'awaiting-merge'],
        },
      },
      order: [['date', 'ASC']],
      include: [
        {
          model: LandRequest,
          include: [PullRequest],
        },
      ],
    });
  };

  public maybeGetStatusForNextRequestInQueue = async (): Promise<LandRequestStatus | null> => {
    const requestStatus = await LandRequestStatus.findOne<LandRequestStatus>({
      where: {
        isLatest: true,
        state: 'queued',
      },
      order: [['date', 'ASC']],
      include: [
        {
          model: LandRequest,
          include: [PullRequest],
        },
      ],
    });
    if (!requestStatus) return null;

    return requestStatus;
  };

  public maybeGetStatusForRunningRequests = async (): Promise<LandRequestStatus[]> => {
    const runningLandRequests = await LandRequestStatus.findAll<LandRequestStatus>({
      where: {
        isLatest: true,
        state: 'running',
      },
      include: [
        {
          model: LandRequest,
          include: [PullRequest],
        },
      ],
    });
    return runningLandRequests;
  };

  public maybeGetStatusForQueuedRequestById = async (
    requestId: number,
  ): Promise<LandRequestStatus | null> => {
    const requestStatus = await LandRequestStatus.findOne<LandRequestStatus>({
      where: {
        requestId: requestId,
        isLatest: true,
        state: 'queued',
      },
      include: [
        {
          model: LandRequest,
        },
      ],
    });
    if (!requestStatus || !requestStatus.request) return null;

    return requestStatus;
  };
}
