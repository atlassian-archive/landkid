// @flow
import Queue from './Queue';
import Client from './Client';
import Logger from './Logger';
import type { Env, LandRequest, StatusEvent } from './types';

export default class Runner {
  queue: Queue;
  running: ?LandRequest;
  client: Client;
  paused: boolean;

  constructor(queue: Queue, client: Client) {
    this.queue = queue;
    this.running = null;
    this.client = client;
    this.paused = true;
  }

  async next() {
    if (this.running) return;
    let landRequest: ?LandRequest = this.queue.dequeue();
    if (!landRequest) return;

    let commit = await landRequest.commit;
    let isAllowedToLand = await this.client.isAllowedToLand(
      landRequest.pullRequestId
    );
    Logger.info(
      { landRequest, isAllowedToLand },
      'Fetching next land request from queue'
    );
    if (isAllowedToLand) {
      const buildId = await this.client.createLandBuild(commit);
      this.running = { ...landRequest, buildId, buildStatus: 'PENDING' };
      Logger.info({ running: this.running }, 'Running is now');
    }
  }

  mergePassedBuildIfRunning(statusEvent: StatusEvent) {
    if (!this.running) return;
    if (statusEvent.buildId === this.running.buildId) {
      if (statusEvent.passed) {
        const pullRequestId = this.running.pullRequestId;
        // this.env.host.mergePullRequest(pullRequestId);
        Logger.info({ pullRequestId }, 'Would have merged PR now');
      }
      this.running = null;
      this.next();
    } else {
      // Comment on the build to tell them it failed?
      // Or don't bother? They'll have a red build status either way.
    }
  }

  cancelCurrentlyRunningBuild() {
    if (!this.running) return;
    const cancelling = this.running;
    this.running = null;
    if (cancelling.buildId) {
      this.client.stopLandBuild(cancelling.buildId);
    }
  }

  pause() {
    this.paused = true;
  }

  unpause() {
    this.paused = false;
  }
}
