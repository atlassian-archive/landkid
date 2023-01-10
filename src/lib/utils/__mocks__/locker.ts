jest.mock('../redis-client');

export const withLock = jest.fn(
  <T>(resource: string, fn: (lockId: Date) => Promise<T>, fallback: T, ttl: number = 60000) => {
    return fn(new Date(123));
  },
);
