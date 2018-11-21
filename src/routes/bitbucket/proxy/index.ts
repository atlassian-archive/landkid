import * as express from 'express';
import { authenticateIncomingBBCall } from '../../middleware';

export function proxyRoutes() {
  const router = express();

  router.use(authenticateIncomingBBCall);

  router.get('/example', (req, res) => res.json({ success: 'it works' }));

  return router;
}
