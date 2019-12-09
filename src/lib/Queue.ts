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

  public getStatusesForQueuedRequests = async (): Promise<LandRequestStatus[]> => {
    return await LandRequestStatus.findAll<LandRequestStatus>({
      where: {
        isLatest: true,
        state: {
          $in: ['queued', 'running'],
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
