// @flow
import express from 'express';
import hosts from './hosts';
import cis from './ci';
import personas from './personas';
import type { Env } from './types';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import Queue from './Queue';
import Runner from './Runner';
import routes from './routes';
import Client from './Client';
import Logger from './Logger';

type Config = {
  port?: number,
  host: $Keys<typeof hosts>,
  hostConfig: {},
  ci: $Keys<typeof cis>,
  ciConfig: {},
  persona?: $Keys<typeof personas>,
  baseUrl: string
};

export default async function atlaskid(config: Config) {
  let server = express();
  let port = config.port || 8000;

  server.use(bodyParser.json());
  server.set('baseUrl', config.baseUrl);

  const host = await hosts[config.host](config.hostConfig);
  const ci = await cis[config.ci](config.ciConfig);
  const persona = personas[config.persona || 'goat'];
  let client = new Client(host, ci, persona);

  let queue = new Queue();
  let runner = new Runner(queue, client);

  routes(server, client, runner);

  return new Promise((resolve, reject) => {
    server.on('error', err => {
      reject(err);
    });

    server.listen(port, () => {
      Logger.info(`Landkid server started at http://localhost:${port}`);
      Logger.info(`BaseUrl set to ${config.baseUrl}`);

      resolve();
    });
  });
}
