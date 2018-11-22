import { createClient } from 'redis';
import { config } from '../Config';

export const client = createClient({
  port: config.deployment.redis.port,
  host: config.deployment.redis.endpoint,
});
