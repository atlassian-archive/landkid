import * as express from 'express';
import * as path from 'path';
import { Runner } from '../Runner';
import { BitbucketClient } from '../bitbucket/BitbucketClient';
import Logger from '../Logger';
import { apiRoutes } from './api';
import { bitbucketRoutes } from './bitbucket';

const bitbucketAddonDescriptor: any = require('../static/bitbucket/atlassian-connect.json');

export function routes(
  server: express.Application,
  client: BitbucketClient,
  runner: Runner,
) {
  const router = express();

  // TODO: Clean up addon descriptor generation
  bitbucketAddonDescriptor.baseUrl = server.settings.baseUrl;
  bitbucketAddonDescriptor.modules.webPanels[0].conditions.push({
    condition: 'equals',
    target: 'repository.uuid',
    params: {
      value: server.settings.repoUuid,
    },
  });

  router.get('/', (req, res) => {
    res.sendStatus(200);
  });

  router.get('/healthcheck', (req, res) => {
    res.sendStatus(200);
  });

  router.get('/ac', (req, res) => {
    res
      .header('Access-Control-Allow-Origin', '*')
      .json(bitbucketAddonDescriptor);
  });
  router.use('/api', apiRoutes(server, runner, client));
  router.use('/bitbucket', bitbucketRoutes(runner, client));

  // if we are in a production build, then serve static files from our static directories (front end
  // ui code)
  if (process.env.NODE_ENV === 'production') {
    router.use(express.static(path.join(__dirname, 'static')));
  }

  // TODO: I don't think this is working as intended right now, dig into this
  router.use(((err, _, res, next) => {
    if (err) {
      Logger.error({ err }, 'Error ');
      res.status(500).send({
        error: err.message,
        stack: err.stack,
      });
    } else {
      next();
    }
  }) as express.ErrorRequestHandler);

  server.use(router);
}
