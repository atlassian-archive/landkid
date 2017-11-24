// @flow
import Queue from './Queue';
import { type Env } from './types';

export default class Runner {
  queue: Queue;
  env: Env;
  paused: boolean;

  constructor(queue: Queue, env: Env) {
    this.queue = queue;
    this.env = env;
    this.paused = true;
  }

  async next() {
    let item = await this.queue.dequeue();
    let commit = await this.env.host.pullRequestToCommit(item.pullRequestId);
    await this.env.ci.createLandBuild(commit);
  }

  pause() {
    this.paused = true;
  }

  unpause() {
    this.paused = false;
  }
}
