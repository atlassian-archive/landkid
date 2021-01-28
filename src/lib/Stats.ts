import * as StatsD from 'hot-shots';

const { MICROS_ENV, MICROS_ENVTYPE, NODE_ENV } = process.env;

let client;

if (!MICROS_ENV || !MICROS_ENVTYPE) {
  console.log('Using dummy client');
  client = {
    increment: (stat: string, tags?: StatsD.Tags) => {},
  };
} else {
  const HOST = NODE_ENV === 'production' ? 'platform-statsd' : 'localhost';

  client = new StatsD.StatsD({
    host: HOST,
    port: 8125,
    prefix: 'atlassian_frontend_landkid.',
    globalTags: {
      micros_env: MICROS_ENV,
      micros_envtype: MICROS_ENVTYPE,
    },
  });
}

export const stats = client;
