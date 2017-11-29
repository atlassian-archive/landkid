// @flow
import bluebird from 'bluebird';
import redis from 'redis';
import BaseModel from './models/BaseModel';

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

export async function createRedisClient({
  host,
  port,
  password
}: {
  host: string,
  port: number,
  password?: string
}) {
  let client = redis.createClient({ host, port });
  if (password) await client.auth(password);
  return client;
}
