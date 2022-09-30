import Redis from 'ioredis-mock';
import { Logger } from '../Logger';
import { Runner } from '../Runner';

jest.mock('../utils/redis-client', () => ({
  // @ts-ignore incorrect type definition
  client: new Redis(),
}));

const loggerInfoSpy: jest.SpyInstance<any, any> = jest.spyOn(Logger, 'info');

const wait = (duration: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration);
  });

// need to wait 3 seconds here because redlock will retry for another 2 seconds when failed to acquire the lock
const returnAfter3Seconds = async () => {
  await wait(3000);
  return [];
};

const pauseRunner = (runner: Runner) => {
  jest.spyOn(runner, 'getPauseState').mockImplementationOnce(() => Promise.resolve({} as any));
};

const mockRunner = () => {
  const mockedQueue: any = {
    getStatusesForWaitingRequests: jest.fn().mockImplementation(returnAfter3Seconds),
    getQueue: jest.fn().mockImplementation(returnAfter3Seconds),
  };
  jest.spyOn(Runner.prototype, 'init').mockImplementation();
  return new Runner(mockedQueue, {} as any, {} as any, {} as any);
};

describe('Check waiting land requests', () => {
  let mockedRunner: Runner;

  beforeAll(() => {
    mockedRunner = mockRunner();
  });

  beforeEach(() => {
    loggerInfoSpy.mockClear();
  });

  test('checkWaitingLandRequests should not run when next is running', async () => {
    const nextPromise = mockedRunner.next();
    const checkPromise = mockedRunner.checkWaitingLandRequests();
    await Promise.all([nextPromise, checkPromise]);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Next() called', expect.anything());
    expect(loggerInfoSpy).not.toHaveBeenCalledWith(
      'Checking for waiting landrequests ready to queue',
      expect.anything(),
    );
  });

  test('next can run when checkWaitingLandRequests is running', async () => {
    const checkPromise = mockedRunner.checkWaitingLandRequests();
    await wait(500);
    const nextPromise = mockedRunner.next();
    await Promise.all([nextPromise, checkPromise]);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Next() called', expect.anything());
    expect(loggerInfoSpy).toHaveBeenCalledWith(
      'Checking for waiting landrequests ready to queue',
      expect.anything(),
    );
  });

  test('checkWaitingLandRequests should not run when it is already running', async () => {
    const checkPromise1 = mockedRunner.checkWaitingLandRequests();
    const checkPromise2 = mockedRunner.checkWaitingLandRequests();
    await Promise.all([checkPromise1, checkPromise2]);
    expect(
      loggerInfoSpy.mock.calls.filter(
        (call) => call[0] === 'Checking for waiting landrequests ready to queue',
      ),
    ).toHaveLength(1);
  });
});

describe('Pause builds', () => {
  let mockedRunner: Runner;
  let getRunningSpy: jest.SpyInstance;

  beforeAll(() => {
    mockedRunner = mockRunner();
    getRunningSpy = jest.spyOn(mockedRunner, 'getRunning');
  });

  beforeEach(() => {
    getRunningSpy.mockClear();
  });

  test('moveFromQueueToRunning will not run when paused', async () => {
    pauseRunner(mockedRunner);
    await mockedRunner.moveFromQueueToRunning({} as any, {} as any);
    expect(getRunningSpy).not.toHaveBeenCalled();
  });
});
