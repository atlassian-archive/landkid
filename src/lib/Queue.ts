import { LandRequestStatus, LandRequest, PullRequest } from '../db';
import { Op } from 'sequelize';

export class LandRequestQueue {
  public getStatusesForWaitingRequests = async () => {
    return LandRequestStatus.findAll<LandRequestStatus>({
      where: {
        isLatest: true,
        state: 'will-queue-when-ready',
        // only retrieve requests from last 7 days
        date: { [Op.gt]: new Date(new Date().getTime() - 7 * 1000 * 60 * 60 * 24) },
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

  // returns the list of queued, running, awaiting-merge, and merging items as these are the actual "queue" per se
  // all the status' we display on the frontend
  public getQueue = async (
    state: IStatusState[] = ['queued', 'running', 'awaiting-merge', 'merging'],
  ) => {
    const queue = await LandRequestStatus.findAll<LandRequestStatus>({
      where: {
        isLatest: true,
        state: {
          $in: state,
        },
      },
      order: [
        [LandRequestStatus.associations?.request, 'priority', 'DESC'],
        ['date', 'ASC'],
      ],
      include: [
        {
          model: LandRequest,
          include: [PullRequest],
        },
      ],
    });
    return queue;
  };

  // returns builds that are running, awaiting-merge, or merging, used to find the dependencies of a request
  // that is about to move to running state
  public getRunning = async (state: IStatusState[] = ['running', 'awaiting-merge', 'merging']) => {
    return LandRequestStatus.findAll<LandRequestStatus>({
      where: {
        isLatest: true,
        state: {
          $in: state,
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

  public maybeGetStatusForNextRequestInQueue = async () => {
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

  public maybeGetStatusForQueuedRequestById = async (requestId: string) => {
    const requestStatus = await LandRequestStatus.findOne<LandRequestStatus>({
      where: {
        requestId,
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
