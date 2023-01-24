import { Runner } from '../../lib/Runner';
import { requireCustomToken } from '../middleware';
import { Express } from 'express';
import { apiRoutes } from './index';
import { StateService } from '../../lib/StateService';

jest.mock('express');
jest.mock('../../lib/Runner');
jest.mock('../../lib/AccountService');
jest.mock('../../lib/StateService');

describe('API Routes', () => {
  let mockExpress: Express;
  let mockRunner: Runner;
  let mockResponse: Express['response'];

  beforeEach(() => {
    jest.clearAllMocks();
    mockRunner = new Runner({} as any, {} as any, {} as any, {} as any);
    mockExpress = apiRoutes(mockRunner, {} as any, {} as any) as any;
    mockResponse = {
      status: jest.fn(() => mockResponse),
      json: jest.fn(() => mockResponse),
      sendStatus: jest.fn(() => mockResponse),
    } as unknown as Express['response'];
  });
  describe('/fail-build', () => {
    let failBuildRoute: [string, ...Function[]];
    let failBuildHandler: Function;
    beforeEach(() => {
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

  describe('/update-concurrent-builds', () => {
    let updateConcurrentBuildRoute: [string, ...Function[]];
    let updateConcurrentBuildHandler: Function;
    beforeEach(() => {
      updateConcurrentBuildRoute = (mockExpress.post as jest.Mock).mock.calls.find(
        (call) => call[0] === '/update-concurrent-builds',
      );
      updateConcurrentBuildHandler = async (req: Function) => {
        const handler = updateConcurrentBuildRoute && updateConcurrentBuildRoute[2];
        if (!handler) return;
        handler(req, mockResponse, () => {});
      };
    });
    it('should be registered', async () => {
      expect(mockExpress.post).toHaveBeenCalledWith(
        '/update-concurrent-builds',
        expect.any(Function),
        expect.any(Function),
      );
      expect(updateConcurrentBuildRoute).toBeDefined();
    });
    it('should fail with status 400 if maxConcurrentBuilds is not supplied', async () => {
      expect(mockResponse.status).not.toHaveBeenCalled();
      await updateConcurrentBuildHandler({ body: {} }, mockExpress.response, () => {});
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ err: 'req.body.maxConcurrentBuilds should be positive number' }),
      );
    });

    it.each([[-1], [0], ['5']])(
      'should fail with status 400 if maxConcurrentBuilds %s is not a positive number',
      async (input) => {
        expect(mockResponse.status).not.toHaveBeenCalled();
        await updateConcurrentBuildHandler(
          {
            body: {
              maxConcurrentBuilds: input,
            },
          },
          mockExpress.response,
          () => {},
        );
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            err: 'req.body.maxConcurrentBuilds should be positive number',
          }),
        );
      },
    );

    it('should update concurrent builds slots', async () => {
      expect(StateService.updateMaxConcurrentBuild).not.toHaveBeenCalled();
      expect(mockRunner.onStatusUpdate).not.toHaveBeenCalled();
      expect(mockResponse.sendStatus).not.toHaveBeenCalled();
      await updateConcurrentBuildHandler(
        {
          body: {
            maxConcurrentBuilds: 3,
          },
          user: { aaid: 'mock-user-aaid' },
        },
        mockExpress.response,
        () => {},
      );
      expect(StateService.updateMaxConcurrentBuild).toHaveBeenCalledWith(3, {
        aaid: 'mock-user-aaid',
      });
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(200);
    });
  });

  describe('/add-priority-branch', () => {
    let addPriorityBranchRoute: [string, ...Function[]];
    let addPriorityBranchHandler: Function;
    beforeEach(() => {
      addPriorityBranchRoute = (mockExpress.post as jest.Mock).mock.calls.find(
        (call) => call[0] === '/add-priority-branch',
      );
      addPriorityBranchHandler = async (req: Function) => {
        const handler = addPriorityBranchRoute && addPriorityBranchRoute[2];
        if (!handler) return;
        handler(req, mockResponse, () => {});
      };
    });
    it('should be registered', async () => {
      expect(mockExpress.post).toHaveBeenCalledWith(
        '/add-priority-branch',
        expect.any(Function),
        expect.any(Function),
      );
      expect(addPriorityBranchRoute).toBeDefined();
    });
    it('should fail when branchName is not provided', async () => {
      await addPriorityBranchHandler({ body: {} }, mockExpress.response, () => {});
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ err: 'Missing branch name' }),
      );
    });
    it('should succeed when branchName and user is provided', async () => {
      jest.spyOn(StateService, 'addPriorityBranch');
      expect(mockRunner.onStatusUpdate).not.toHaveBeenCalled();
      expect(mockResponse.sendStatus).not.toHaveBeenCalled();
      await addPriorityBranchHandler(
        {
          body: {
            branchName: 'test/test-branch',
          },
          user: { aaid: 'mock-user-aaid' },
        },
        mockExpress.response,
        () => {},
      );
      expect(StateService.addPriorityBranch).toHaveBeenCalledWith('test/test-branch', {
        aaid: 'mock-user-aaid',
      });
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'test/test-branch successfully added.' }),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
  describe('/remove-priority-branch', () => {
    let removePriorityBranchRoute: [string, ...Function[]];
    let removePriorityBranchHandler: Function;
    beforeEach(() => {
      removePriorityBranchRoute = (mockExpress.post as jest.Mock).mock.calls.find(
        (call) => call[0] === '/remove-priority-branch',
      );
      removePriorityBranchHandler = async (req: Function) => {
        const handler = removePriorityBranchRoute && removePriorityBranchRoute[2];
        if (!handler) return;
        handler(req, mockResponse, () => {});
      };
    });
    it('should be registered', async () => {
      expect(mockExpress.post).toHaveBeenCalledWith(
        '/remove-priority-branch',
        expect.any(Function),
        expect.any(Function),
      );
      expect(removePriorityBranchRoute).toBeDefined();
    });
    it('should fail when branchName is not provided', async () => {
      await removePriorityBranchHandler({ body: {} }, mockExpress.response, () => {});
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ err: 'Missing branch name' }),
      );
    });
    it('should succeed when branchName and user is provided', async () => {
      jest.spyOn(StateService, 'removePriorityBranch');
      expect(mockRunner.onStatusUpdate).not.toHaveBeenCalled();
      expect(mockResponse.sendStatus).not.toHaveBeenCalled();
      await removePriorityBranchHandler(
        {
          body: {
            branchName: 'test/test-branch',
          },
        },
        mockExpress.response,
        () => {},
      );
      expect(StateService.removePriorityBranch).toHaveBeenCalledWith('test/test-branch');
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'test/test-branch successfully removed.' }),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
  // todo: add tests for other routes
});
