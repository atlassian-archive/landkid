import { LandRequestStatus, LandRequest, PullRequest } from '../db';

const PAGE_LEN = 20;

export class LandRequestHistory {
  public getHistory = async (page: number): Promise<HistoryResponse> => {
    const actualPage = page - 1;
    // First we need to know which landrequests have changed recently
    const latestLandRequestStatuses = await LandRequestStatus.findAndCountAll<LandRequestStatus>({
      where: {
        isLatest: true,
        state: ['success', 'fail', 'aborted'],
      },
      order: [['date', 'DESC']],
      limit: PAGE_LEN,
      offset: actualPage * PAGE_LEN,
      include: [
        {
          model: LandRequest,
          include: [PullRequest],
        },
      ],
    });

    return {
      history: latestLandRequestStatuses.rows,
      count: latestLandRequestStatuses.count,
      pageLen: PAGE_LEN,
    };
  };
}
