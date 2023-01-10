import { Runner } from '../../lib/Runner';
import { requireCustomToken } from '../middleware';
import { Express } from 'express';
import { apiRoutes } from './index';

jest.mock('express');
jest.mock('../../lib/Runner');
jest.mock('../../lib/AccountService');

describe('API Routes', () => {
  let mockExpress: Express;
  let mockRunner: Runner;
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunner = new Runner({} as any, {} as any, {} as any, {} as any);
    mockExpress = apiRoutes(mockRunner, {} as any, {} as any) as any;
  });
  describe('/fail-build', () => {
    let failBuildRoute: [string, ...Function[]];
    let failBuildHandler: Function;
    let mockResponse: Express['response'];
    beforeEach(() => {
      mockResponse = {
        status: jest.fn(() => mockResponse),
        json: jest.fn(() => mockResponse),
        sendStatus: jest.fn(() => mockResponse),
      } as unknown as Express['response'];
      failBuildRoute = (mockExpress.post as jest.Mock).mock.calls.find(
        (call) => call[0] === '/fail-build',
      );
      failBuildHandler = async (req: Function) => {
        const handler = failBuildRoute && failBuildRoute[2];
        if (!handler) return;
        handler(req, mockResponse, () => {});
      };
    });
    it('should be registered', async () => {
      expect(mockExpress.post).toHaveBeenCalledWith(
        '/fail-build',
        requireCustomToken,
        expect.any(Function),
      );
      expect(failBuildRoute).toBeDefined();
    });
    it('should fail with status 400 if buildId not supplied', async () => {
      expect(mockResponse.status).not.toHaveBeenCalled();
      await failBuildHandler({ body: {} }, mockExpress.response, () => {});
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ err: 'req.body.buildId expected' }),
      );
    });

    it('should fail land request corresponding to provided buildId', async () => {
      expect(mockRunner.onStatusUpdate).not.toHaveBeenCalled();
      expect(mockResponse.sendStatus).not.toHaveBeenCalled();
      await failBuildHandler(
        {
          body: {
            buildId: '1234',
          },
        },
        mockExpress.response,
        () => {},
      );
      expect(mockRunner.onStatusUpdate).toHaveBeenCalledWith({
        buildId: '1234',
        buildStatus: 'FAILED',
      });
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(200);
    });
  });
});
