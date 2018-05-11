// @flow
import Queue from './Queue';
import Client from './Client';
import Logger from './Logger';
import type { LandRequest, StatusEvent } from './types';

export default class Runner {
  queue: Queue;
  running: ?LandRequest;
  // we'll just store the waitingToLand in a simple list for now
  // TODO: Clean up all the state in Runner to make more sense
  waitingToLand: Array<LandRequest>;
  locked: boolean;
  client: Client;
  started: Date;
  paused: boolean;
  pausedReason: ?string;

  constructor(queue: Queue, client: Client) {
    this.queue = queue;
    this.waitingToLand = [];
    this.running = null;
    this.locked = false;
    this.client = client;
    this.started = new Date();
    this.paused = false;
    this.pausedReason = null;

    // call our checkWaitingLandRequests() function on an interval so that we are always clearing out waiting builds
    const timeBetweenChecksMins = 2;
    setInterval(() => {
      this.checkWaitingLandRequests();
    }, timeBetweenChecksMins * 60 * 1000);
  }

  async next() {
    Logger.info(
      {
        running: this.running,
        locked: this.locked,
        queue: this.queue,
        waitingToLand: this.waitingToLand
      },
      'Next() called'
    );

    if (this.running || this.locked) return;
    let landRequest: ?LandRequest = this.queue.dequeue();
    if (!landRequest) return;
    this.locked = true;
    Logger.info(
      {
        landRequest
      },
      'Checking if still allowed to land...'
    );

    let commit = landRequest.commit;
    let isAllowedToLand = await this.client.isAllowedToLand(
      landRequest.pullRequestId
    );

    if (isAllowedToLand.isAllowed) {
      Logger.info(
        {
          landRequest
        },
        'Allowed to land, creating land build'
      );
      const buildId = await this.client.createLandBuild(commit);
      this.running = {
        ...landRequest,
        buildId,
        buildStatus: 'PENDING'
      };
      this.locked = false;
      Logger.info(
        {
          running: this.running
        },
        'Land build now running'
      );
    } else {
      Logger.info(
        {
          ...isAllowedToLand,
          ...landRequest
        },
        'Land request is not allowed to land'
      );
      this.locked = false;
      this.next();
    }
  }

  onStatusUpdate = (statusEvent: StatusEvent) => {
    let running = this.running;

    if (!running) {
      return Logger.info(
        statusEvent,
        'No build running, status event is irrelevant'
      );
    }

    if (running.buildId !== statusEvent.buildId) {
      return Logger.warn(
        {
          statusEvent,
          running
        },
        `StatusEvent buildId doesn't match currently running buildId – ${
          statusEvent.buildId
        } !== ${running.buildId || ''}`
      );
    }

    Logger.info(
      {
        statusEvent,
        running
      },
      'Build status update'
    );

    this.running = running = {
      ...running,
      buildStatus: statusEvent.buildStatus
    };

    if (statusEvent.passed) {
      this.mergePassedBuild(running);
      this.running = null;
      this.next();
    } else if (statusEvent.failed) {
      Logger.error(
        {
          running,
          statusEvent
        },
        'Land build failed'
      );
      this.running = null;
      this.next();
    } else if (statusEvent.stopped) {
      Logger.warn(
        {
          running,
          statusEvent
        },
        'Land build has been stopped'
      );
      this.running = null;
      this.next();
    }
  };

  mergePassedBuild(running: LandRequest) {
    const pullRequestId = running.pullRequestId;
    Logger.info(
      {
        pullRequestId,
        running
      },
      'Merging pull request'
    );
    this.client.mergePullRequest(pullRequestId);
  }

  cancelCurrentlyRunningBuild() {
    if (!this.running) return;
    const cancelling = this.running;
    this.running = null;
    this.locked = false;
    if (cancelling.buildId) {
      this.client.stopLandBuild(cancelling.buildId);
    }
  }

  pause(reason: ?string) {
    this.paused = true;
    if (reason) {
      this.pausedReason = reason;
    }
  }

  unpause() {
    this.paused = false;
    this.pausedReason = null;
  }

  // locking is an internal implementation detail, but we've seen at least one instance of a landkid
  // server becoming stuck, this is an escape hatch until we find the logic error that caused it
  // (likely a dropped request somehwhere).
  unlock() {
    this.locked = false;
  }

  enqueue(landRequest: LandRequest) {
    if (this.paused) return;
    return this.queue.enqueue(landRequest);
  }

  removeLandReuqestByPullRequestId(pullRequestId: string) {
    this.queue.filter(
      landRequest => landRequest.pullRequestId !== pullRequestId
    );
    if (this.running && this.running.pullRequestId === pullRequestId) {
      this.running = null;
    }
  }

  addToWaitingToLand(landRequest: LandRequest) {
    // make sure we don't already have this landRequest queued
    if (
      !this.waitingToLand.find(
        req => req.pullRequestId === landRequest.pullRequestId
      )
    ) {
      this.waitingToLand.push(landRequest);
    }
    // also check if we can immediately go into the queue
    this.checkWaitingLandRequests();
  }

  // the name of this function is enough to show how badly thought out this state is
  moveFromWaitingToQueue(pullRequestId: string) {
    const landRequest = this.waitingToLand.find(
      req => req.pullRequestId === pullRequestId
    );
    if (!landRequest) {
      Logger.error(
        {
          waitingToLand: this.waitingToLand,
          pullRequestId
        },
        'Unable to find landrequest to move to queue'
      );
      return;
    }
    Logger.info(
      {
        landRequest
      },
      'Moving landRequest from waiting to queue'
    );

    this.waitingToLand = this.waitingToLand.filter(
      req => req.pullRequestId !== pullRequestId
    );
    landRequest.createdTime = new Date();
    this.enqueue(landRequest);
    this.next();
  }

  async checkWaitingLandRequests() {
    Logger.info(
      {
        waiting: this.waitingToLand
      },
      'Checking for waiting landrequests ready to queue'
    );

    for (let landRequest of this.waitingToLand) {
      const pullRequestId = landRequest.pullRequestId;
      let isAllowedToLand = await this.client.isAllowedToLand(pullRequestId);

      if (isAllowedToLand.isAllowed) {
        this.moveFromWaitingToQueue(pullRequestId);
      }
    }
  }

  getState() {
    return {
      queue: this.queue.list(),
      running: Object.assign({}, this.running),
      waitingToLand: this.waitingToLand,
      locked: this.locked,
      started: this.started,
      paused: this.paused,
      pausedReason: this.pausedReason
    };
  }
}
