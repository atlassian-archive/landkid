import * as RedLock from 'redlock';
import { client } from './redis-client';

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
    console.error(`Error failed while in lock for "${resource}"`, err);
  }
  await lock.unlock();
  return result!;
};
