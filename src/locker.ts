import { createClient } from 'redis';
import * as RedLock from 'redlock';

const client = createClient();

const redlock = new RedLock([client]);

export const withLock = async <T>(resource: string, fn: () => Promise<T>) => {
  const lock = await redlock.lock(resource, 60000)
  let result: T;
  try {
    result = await fn();
  } catch (err) {
    console.error(`Error failed while in lock for "${resource}"`, err);
  }
  await lock.unlock();
  return result!;
}