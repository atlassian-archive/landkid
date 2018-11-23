import { LandRequestStatus, LandRequest, PullRequest } from '../db';

export class LandRequestQueue {
  public getStatusesForWaitingRequests = async (): Promise<
    LandRequestStatus[]
  > => {
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

  public getStatusesForQueuedRequests = async (): Promise<
    LandRequestStatus[]
  > => {
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
    const status = await LandRequestStatus.findOne<LandRequestStatus>({
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
    if (!status) return null;

    return status;
  };

  public maybeGetStatusForRunningRequest = async (): Promise<LandRequestStatus | null> => {
    const requestStatus = await LandRequestStatus.findOne<LandRequestStatus>({
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
    if (!requestStatus) return null;

    return requestStatus;
  };
}
