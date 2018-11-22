import { LandRequestStatus, LandRequest, PullRequest } from '../db';

const PAGE_LEN = 20;

export class LandRequestHistory {
  public getHistory = async (page: number): Promise<HistoryResponse> => {
    const actualPage = page - 1;
    // First we need to know which landrequests have changed recently
    const latestLandRequestStatuses = await LandRequestStatus.findAndCountAll<
      LandRequestStatus
    >({
      where: {
        isLatest: true,
      },
      order: [['date', 'DESC']],
      limit: PAGE_LEN,
      offset: actualPage * PAGE_LEN,
      attributes: ['requestId'],
    });

    // Now we need to fetch all the associated data for those requests
    const allHistoryData = await LandRequest.findAll<LandRequest>({
      where: {
        id: {
          $in: latestLandRequestStatuses.rows.map(s => s.requestId),
        },
      },
      order: [['created', 'DESC']],
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

    return {
      history: transformedHistory,
      count: latestLandRequestStatuses.count,
      pageLen: PAGE_LEN,
    };
  };
}
