import { LandRequestQueue } from './Queue';
import Client from './Client';
// import History from './History';
import Logger from './Logger';
import { StatusEvent, RunnerState, Config, LandRequestOptions } from './types';
import { withLock } from './locker';
import { LandRequest, PauseStateTransition, PullRequest, Permission, LandRequestStatus } from './db';

export default class Runner {
  queue: LandRequestQueue;
  // history: History;
  // we'll just store the waitingToLand in a simple list for now
  // TODO: Clean up all the state in Runner to make more sense
  // waitingToLand: Array<LandRequest>;
  client: Client;
  config: Config;

  constructor(queue: LandRequestQueue, client: Client, config: Config) {
    this.queue = queue;
    this.client = client;
    // this.history = history;
    this.config = config;

    // call our checkWaitingLandRequests() function on an interval so that we are always clearing out waiting builds
    const timeBetweenChecksMins = 2;
    setInterval(() => {
      this.checkWaitingLandRequests();
    }, timeBetweenChecksMins * 60 * 1000);
  }

  async getRunning() {
    return this.queue.maybeGetStatusForRunningRequest();
  }

  async next() {
    await withLock('Runner:next', async () => {
      const running = await this.getRunning();
      Logger.info(
        {
          running: running,
          queue: this.queue,
        },
        'Next() called',
      );

      if (running) return;

      const landRequestInfo = await this.queue.maybeGetStatusForNextRequestInQueue();
      if (!landRequestInfo) return;
      const landRequest = landRequestInfo.request;
      Logger.info({ landRequest: landRequest.get() }, 'Checking if still allowed to land...');
  
      const commit = landRequest.forCommit;
      const isAllowedToLand = await this.client.isAllowedToLand(
        landRequest.pullRequestId,
      );
  
      if (isAllowedToLand.isAllowed) {
        Logger.info({ landRequest: landRequest.get() }, 'Allowed to land, creating land build');
        const buildId = await this.client.createLandBuild(commit);
        if (!buildId) return;
  
        await landRequest.setStatus('running');

        landRequest.buildId = buildId;
        await landRequest.save();

        Logger.info({ running: landRequest.get() }, 'Land build now running');
      } else {
        Logger.info(
          { ...isAllowedToLand, ...landRequest.get() },
          'Land request is not allowed to land',
        );
        this.next();
      }
    });
  }

  onStatusUpdate = async (statusEvent: StatusEvent) => {
    const running = await this.getRunning();
    if (!running) {
      Logger.info(statusEvent, 'No build running, status event is irrelevant');
      return;
    }

    if (running.request.buildId !== statusEvent.buildId) {
      return Logger.warn(
        { statusEvent, running },
        `StatusEvent buildId doesn't match currently running buildId – ${
          statusEvent.buildId
        } !== ${running.request.buildId || ''}`,
      );
    }

    Logger.info({ statusEvent, running }, 'Build status update');

    // Add build status
    // this.running = running = {
    //   ...running,
    //   buildStatus: statusEvent.buildStatus,
    // };

    // let addToHistory = () =>
    //   this.history.set(statusEvent, { ...running, finishedTime: new Date() });

    switch (statusEvent.buildStatus) {
      case 'SUCCESSFUL': {
        await this.mergePassedBuild(running.request);
        break;
      }
      case 'FAILED': {
        Logger.error({ running: running.get(), statusEvent }, 'Land build failed');
        await running.request.setStatus('fail');
        break;
      }
      case 'STOPPED': {
        Logger.warn({ running: running.get(), statusEvent }, 'Land build has been stopped');
        await running.request.setStatus('aborted', 'Landkid pipelines build was stopped');
        break;
      }
    }

    // if (statusEvent.) {
    //   this.mergePassedBuild(running);
    //   // addToHistory();
    //   // this.running = null;
    //   this.next();
    // } else if (statusEvent.failed) {
    //   Logger.error({ running, statusEvent }, 'Land build failed');
    //   // addToHistory();
    //   // this.running = null;
    //   this.next();
    // } else if (statusEvent.stopped) {
    //   Logger.warn({ running, statusEvent }, 'Land build has been stopped');
    //   // addToHistory();
    //   // this.running = null;
    //   this.next();
    // }
  };

  mergePassedBuild(running: LandRequest) {
    const pullRequestId = running.pullRequestId;
    Logger.info({ pullRequestId, running }, 'Merging pull request');
    this.client.mergePullRequest(pullRequestId);
  }

  async cancelCurrentlyRunningBuild() {
    const running = await this.getRunning();
    if (!running) return;

    // TODO: Add the user
    await running.request.setStatus('aborted', 'Cancelled by user');

    if (running.request.buildId) {
      this.client.stopLandBuild(running.request.buildId);
    }
  }

  async pause(reason: string) {
    await PauseStateTransition.create<PauseStateTransition>({
      paused: true,
      reason,
      // TODO: Get AAID here
      pauserAaid: '__TOTALLY_AN_AAID__'
    });
  }

  async unpause() {
    await PauseStateTransition.create<PauseStateTransition>({
      paused: false,
      // TODO: Get AAID here
      pauserAaid: '__TOTALLY_AN_AAID__'
    });
  }

  private getPauseState = async (): Promise<IPauseState> => {
    const state = await PauseStateTransition.findOne<PauseStateTransition>({
      order: [['date', 'DESC']],
    });
    if (!state) {
      return {
        id: '_',
        date: new Date(0),
        paused: false,
        pauserAaid: '',
        reason: null,
      };
    }
    return state.get();
  }

  private isPaused = async () => {
    const state = await PauseStateTransition.findOne<PauseStateTransition>({
      order: [['date', 'DESC']],
    });
    if (!state) return false;
    return state.paused;
  }

  private async createRequestFromOptions(landRequestOptions: LandRequestOptions) {
    const pr = await PullRequest.findOne<PullRequest>({
      where: {
        prId: landRequestOptions.prId,
      },
    }) || await PullRequest.create<PullRequest>({
      prId: landRequestOptions.prId,
      authorAaid: landRequestOptions.prAuthorAaid,
      title: landRequestOptions.prTitle,
    });

    return await LandRequest.create<LandRequest>({
      triggererAaid: landRequestOptions.triggererAaid,
      pullRequestId: pr.id,
      forCommit: landRequestOptions.commit,
    });
  }

  async removeLandRequestByPullRequestId(pullRequestId: number) {
    const requests = await LandRequest.findAll<LandRequest>({
      where: {
        pullRequestId,
      },
    });
    for (const request of requests) {
      // TODO: Record user who cancelled here
      await request.setStatus('aborted', 'Cancelled by user');
    }
  }

  async enqueue(landRequestOptions: LandRequestOptions) {
    // TODO: Ensure no land request is pending for this PR
    if (await this.isPaused()) return;

    const request = await this.createRequestFromOptions(landRequestOptions);
    await request.setStatus('queued');
  }


  async addToWaitingToLand(landRequestOptions: LandRequestOptions) {
    // TODO: Ensure no land request is pending for this PR
    const request = await this.createRequestFromOptions(landRequestOptions);
    await request.setStatus('will-queue-when-ready');

    this.checkWaitingLandRequests();
  }

  async moveFromWaitingToQueue(pullRequestId: number) {
    const requests = await LandRequest.findAll<LandRequest>({
      where: {
        pullRequestId,
      },
    });
    for (const request of requests) {
      const status = await request.getStatus();
      if (status && status.state !== 'will-queue-when-ready') continue;

      await request.setStatus('queued');
    }
    Logger.info(
      {
        requests,
      },
      'Moving landRequest from waiting to queue',
    );

    // this.next();
  }

  async checkWaitingLandRequests() {
    Logger.info(
      'Checking for waiting landrequests ready to queue',
    );

    for (let landRequest of await this.queue.getStatusesForWaitingRequests()) {
      const pullRequestId = landRequest.request.pullRequestId;
      let isAllowedToLand = await this.client.isAllowedToLand(pullRequestId);

      if (isAllowedToLand.isAllowed) {
        this.moveFromWaitingToQueue(pullRequestId);
      }
    }
  }

  private getUsersAllowedToLand = async () => {
    return (await Permission.findAll<Permission>({
      where: {
        mode: {
          $in: ['land', 'admin'],
        },
      },
      order: [['dateAssigned', 'DESC']],
      group: 'aaid',
    })).map(p => p.aaid);
  }

  private getDatesSinceLastFailures = async (): Promise<number> => {
    const lastFailure = await LandRequestStatus.findOne<LandRequestStatus>({
      where: {
        state: {
          $in: ['fail', 'aborted'],
        },
      },
      order: [['date', 'DESC']],
    });
    if (!lastFailure) return -1;
    return Math.floor((Date.now() - lastFailure.date.getTime()) / (1000 * 60 * 60 * 24));
  }

  async getState(): Promise<RunnerState> {
    const [daysSinceLastFailure, pauseState, queue, usersAllowedToLand, waitingToQueue] = await Promise.all([
      this.getDatesSinceLastFailures(),
      this.getPauseState(),
      this.queue.getStatusesForQueuedRequests(),
      this.getUsersAllowedToLand(),
      this.queue.getStatusesForWaitingRequests(),
    ]);
    return {
      daysSinceLastFailure,
      pauseState,
      queue,
      usersAllowedToLand,
      waitingToQueue,
      bitbucketBaseUrl: `https://bitbucket.org/${this.config.hostConfig.repoOwner}/${
        this.config.hostConfig.repoName
      }`
    };
  }
}
