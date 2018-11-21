import * as express from 'express';

export function proxyRoutes() {
  const router = express();

  router.get('/example', (req, res) => res.json({ success: 'it works' }));

  return router;
}
