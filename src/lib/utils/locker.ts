import * as RedLock from 'redlock';
import { client } from './redis-client';
import { Logger } from '../Logger';

const redlock = new RedLock([client]);

export const withLock = async <T>(
  resource: string,
  fn: (lockId: Date) => Promise<T>,
  fallback: T,
) => {
  let lock: RedLock.Lock;
  let lockId: Date;
  try {
    lock = await redlock.lock(resource, 60000);
    lockId = new Date();
    Logger.info(`Locked "${resource}"`, {
      namespace: 'lib:utils:locker:withLock',
      lockId,
    });
  } catch {
    return fallback;
  }
  let result: T;
  try {
    result = await fn(lockId);
  } catch (err) {
    Logger.error(`Error failed while in lock for "${resource}"`, {
      namespace: 'lib:utils:locker:withLock',
      err,
    });
  }
  await lock.unlock();
  Logger.info(`Unlocked "${resource}"`, {
    namespace: 'lib:utils:locker:withLock',
    lockId,
  });
  return result!;
};
