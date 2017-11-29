// @flow
import { type Env } from './types';
import Queue from './Queue';
import Runner from './Runner';
import LandRequest from './models/LandRequest';
import onComment from './events/onComment';
import onStatus from './events/onStatus';

function wrap(fn: Function) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default function routes(
  server: any,
  env: Env,
  queue: Queue,
  runner: Runner
) {
  server.get(
    '/api/land-requests',
    wrap(async (req, res) => {
      let items = await queue.list('land-requests');
      res.status(200).send({ landRequests: items });
    })
  );

  server.post(
    '/api/land-requests/enqueue',
    wrap(async (req, res) => {
      let landRequest = LandRequest.create({
        pullRequestId: req.body.pullRequestId,
        commentId: req.body.commentId,
        userId: req.body.userId
      });
      let position = await queue.enqueue('land-requests', landRequest);
      res.status(200).send({ landRequest, position });
    })
  );

  server.get(
    '/api/land-requests/dequeue',
    wrap(async (req, res) => {
      let landRequest = await queue.dequeue('land-requests');
      LandRequest.validate(landRequest);
      res.status(200).send({ landRequest });
    })
  );

  // server.post(
  //   '/api/land-requests/remove',
  //   wrap(async (req, res) => {
  //     let removed = await queue.remove(req.body.pullRequestId);
  //     res.status(200).send({ removed });
  //   })
  // );

  // server.post(
  //   '/api/land-requests/pause',
  //   wrap(async (req, res) => {
  //     runner.pause();
  //     res.status(200).send({ paused: runner.paused });
  //   })
  // );
  //
  // server.post(
  //   '/api/land-requests/unpause',
  //   wrap(async (req, res) => {
  //     runner.unpause();
  //     res.status(200).send({ paused: runner.paused });
  //   })
  // );

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
      res.status(500).send({ error: err.message, stack: err.stack });
    } else {
      next();
    }
  });
}
