import * as RedLock from 'redlock';
import { client } from './redis-client';
import { Logger } from '../Logger';

const redlock = new RedLock([client]);

export const withLock = async <T>(resource: string, fn: () => Promise<T>) => {
  let lock: RedLock.Lock;
  try {
    lock = await redlock.lock(resource, 60000);
  } catch {
    return;
  }
  let result: T;
  try {
    result = await fn();
  } catch (err) {
    Logger.error(`Error failed while in lock for "${resource}"`, {
      namespace: 'lib:utils:locker:withLock',
      err,
    });
  }
  await lock.unlock();
  return result!;
};
