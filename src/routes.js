// @flow
import { type Env } from './types';
import Queue from './Queue';
import Runner from './Runner';
import onComment from './events/onComment';
import onStatus from './events/onStatus';

function wrap(fn: Function) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default function api(
  server: any,
  env: Env,
  queue: Queue,
  runner: Runner
) {
  server.get(
    '/',
    wrap(async (req, res) => {
      res.redirect(301, '/status');
    })
  );

  server.get(
    '/status',
    wrap(async (req, res) => {
      let items = await queue.read();
      res.status(200).send({ queue: items });
    })
  );

  server.post(
    '/enqueue',
    wrap(async (req, res) => {
      let item = {
        pullRequestId: req.body.pullRequestId,
        commentId: req.body.commentId,
        userId: req.body.userId,
        buildId: req.body.buildId || null
      };
      let position = await queue.enqueue(item);
      res.status(200).send({ position, item });
    })
  );

  server.get(
    '/dequeue',
    wrap(async (req, res) => {
      let item = await queue.dequeue();
      res.status(200).send({ item });
    })
  );

  server.post(
    '/remove',
    wrap(async (req, res) => {
      let removed = await queue.remove(req.body.pullRequestId);
      res.status(200).send({ removed });
    })
  );

  server.post(
    '/pause',
    wrap(async (req, res) => {
      runner.pause();
      res.status(200).send({ paused: runner.paused });
    })
  );

  server.post(
    '/unpause',
    wrap(async (req, res) => {
      runner.unpause();
      res.status(200).send({ paused: runner.paused });
    })
  );

  server.post(
    '/webhook/comment',
    wrap(async (req, res) => {
      res.status(200).send({});
      await onComment(env, req.body);
    })
  );

  server.post(
    '/webhook/status',
    wrap(async (req, res) => {
      res.status(200).send({});
      await onStatus(env, req.body);
    })
  );

  server.use((err, req, res, next) => {
    if (err) {
      res.status(500).send({ error: err.message });
    } else {
      next();
    }
  });
}
