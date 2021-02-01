import * as StatsD from 'hot-shots';
import { config } from '../Config';

const { MICROS_ENV, MICROS_ENVTYPE } = process.env;

let client;

if (!MICROS_ENV || !MICROS_ENVTYPE || !config.metrics) {
  client = {
    increment: (stat: string, tags?: StatsD.Tags) => {},
    timing: (
      stat: string | string[],
      value: number | Date,
      sampleRate?: number,
      tags?: StatsD.Tags,
      callback?: StatsD.StatsCb,
    ) => {},
  };
} else {
  const { host, port, prefix } = config.metrics;
  client = new StatsD.StatsD({
    host,
    port,
    prefix,
    globalTags: {
      micros_env: MICROS_ENV,
      micros_envtype: MICROS_ENVTYPE,
    },
  });
}

export const stats = client;
