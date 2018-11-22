import { LandRequestStatus, LandRequest, PullRequest } from '../db';

const PAGE_LEN = 20;

export class LandRequestHistory {
  public getHistory = async (): Promise<HistoryItem[]> => {
    // First we need to know which landrequests have changed recently
    const latestLandRequestStatuses = await LandRequestStatus.findAll<
      LandRequestStatus
    >({
      where: {
        isLatest: true,
      },
      order: [['date', 'ASC']],
      limit: PAGE_LEN,
      offset: 0,
      attributes: ['requestId'],
    });

    // Now we need to fetch all the associated data for those requests
    const allHistoryData = await LandRequest.findAll<LandRequest>({
      where: {
        id: {
          $in: latestLandRequestStatuses.map(s => s.requestId),
        },
      },
      include: [PullRequest, LandRequestStatus],
    });

    // Just need to slightly transform the shape to match HistoryItem
    const transformedHistory = allHistoryData.map(data => {
      const { statuses: statusEvents, ...request } = data.get();

      return {
        statusEvents,
        request,
      };
    });

    return transformedHistory;
  };
}
