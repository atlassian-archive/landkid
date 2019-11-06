import { LandRequestQueue } from './Queue';
import { BitbucketClient } from '../bitbucket/BitbucketClient';
import { LandRequestHistory } from './History';
import { Logger } from './Logger';
import { RunnerState, Config, LandRequestOptions } from '../types';
import { withLock } from './utils/locker';
import {
  Installation,
  LandRequest,
  PauseStateTransition,
  PullRequest,
  Permission,
  LandRequestStatus,
} from '../db';
import { permissionService } from './PermissionService';

export class Runner {
  constructor(
    public queue: LandRequestQueue,
    private history: LandRequestHistory,
    private client: BitbucketClient,
    private config: Config,
  ) {
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
      Logger.info('Next() called', {
        running: running,
        queue: this.queue,
      });

      if (running) return;

      // check if there is something else in the queue
      const landRequestInfo = await this.queue.maybeGetStatusForNextRequestInQueue();
      if (!landRequestInfo) return;
      const landRequest = landRequestInfo.request;
      Logger.info('Checking if still allowed to land...', {
        landRequest: landRequest.get(),
      });

      // TODO: Pass this commit in to isAllowed to land and make sure it hasnt changed
      const commit = landRequest.forCommit;
      const isAllowedToLand = await this.client.isAllowedToLand(landRequest.pullRequestId);

      if (isAllowedToLand.errors.length === 0) {
        Logger.info('Allowed to land, creating land build', {
          landRequest: landRequest.get(),
        });
        const buildId = await this.client.createLandBuild(commit);
        if (!buildId) return;

        await landRequest.setStatus('running');

        landRequest.buildId = buildId;
        await landRequest.save();

        Logger.info('Land build now running', { running: landRequest.get() });
      } else {
        Logger.info(
          { ...isAllowedToLand, ...landRequest.get() },
          'Land request is not allowed to land',
        );
        await landRequest.setStatus('fail', 'Land request did not pass land checks');
        this.next();
      }
    });
  }

  onStatusUpdate = async (statusEvent: BB.BuildStatusEvent) => {
    const running = await this.getRunning();
    if (!running) {
      Logger.info('No build running, status event is irrelevant', statusEvent);
      return;
    }

    if (running.request.buildId !== statusEvent.buildId) {
      return Logger.warn(
        `StatusEvent buildId doesn't match currently running buildId – ${
          statusEvent.buildId
        } !== ${running.request.buildId || ''}`,
        { statusEvent, running },
      );
    }

    Logger.info('Build status update', { statusEvent, running });

    switch (statusEvent.buildStatus) {
      case 'SUCCESSFUL': {
        try {
          const pullRequestId = running.request.pullRequestId;
          Logger.info('Attempting merge pull request', { pullRequestId, running });
          await this.client.mergePullRequest(pullRequestId);
          await running.request.setStatus('success');
        } catch (err) {
          await running.request.setStatus('fail', 'Unable to merge pull request');
        }
        break;
      }
      case 'FAILED': {
        Logger.error('Land build failed', {
          running: running.get(),
          statusEvent,
        });
        await running.request.setStatus('fail', 'Landkid build failed');
        break;
      }
      case 'STOPPED': {
        Logger.warn('Land build has been stopped', {
          running: running.get(),
          statusEvent,
        });
        await running.request.setStatus('aborted', 'Landkid pipelines build was stopped');
        break;
      }
    }

    this.next();
  };

  async cancelCurrentlyRunningBuild(user: ISessionUser) {
    const running = await this.getRunning();
    if (!running) return;

    await running.request.setStatus(
      'aborted',
      `Cancelled by user "${user.aaid}" (${user.displayName})`,
    );

    if (running.request.buildId) {
      this.client.stopLandBuild(running.request.buildId);
    }
  }

  async pause(reason: string, user: ISessionUser) {
    await PauseStateTransition.create<PauseStateTransition>({
      paused: true,
      reason,
      pauserAaid: user.aaid,
    });
  }

  async unpause(user: ISessionUser) {
    await PauseStateTransition.create<PauseStateTransition>({
      paused: false,
      pauserAaid: user.aaid,
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
  };

  public isPaused = async (): Promise<
    | {
        isPaused: true;
        reason: string;
      }
    | {
        isPaused: false;
      }
  > => {
    const state = await PauseStateTransition.findOne<PauseStateTransition>({
      order: [['date', 'DESC']],
    });
    if (!state) return { isPaused: false };
    return state.paused ? { isPaused: false } : { isPaused: true, reason: state.reason };
  };

  private async createRequestFromOptions(landRequestOptions: LandRequestOptions) {
    const pr =
      (await PullRequest.findOne<PullRequest>({
        where: {
          prId: landRequestOptions.prId,
        },
      })) ||
      (await PullRequest.create<PullRequest>({
        prId: landRequestOptions.prId,
        authorAaid: landRequestOptions.prAuthorAaid,
        title: landRequestOptions.prTitle,
      }));

    return await LandRequest.create<LandRequest>({
      triggererAaid: landRequestOptions.triggererAaid,
      pullRequestId: pr.prId,
      forCommit: landRequestOptions.commit,
    });
  }

  async removeLandRequestByPullRequestId(pullRequestId: number, user: ISessionUser) {
    const requests = await LandRequest.findAll<LandRequest>({
      where: {
        pullRequestId,
      },
    });
    for (const request of requests) {
      await request.setStatus('aborted', `Cancelled by user: "${user.aaid}" (${user.displayName})`);
    }
  }

  async enqueue(landRequestOptions: LandRequestOptions): Promise<void> {
    // TODO: Ensure no land request is pending for this PR
    if ((await this.isPaused()).isPaused) return;

    const request = await this.createRequestFromOptions(landRequestOptions);
    await request.setStatus('queued');
  }

  async addToWaitingToLand(landRequestOptions: LandRequestOptions) {
    // TODO: Ensure no land request is pending for this PR
    if ((await this.isPaused()).isPaused) return;
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
    Logger.info('Moving landRequests from waiting to queue', { requests });

    this.next();
  }

  async checkWaitingLandRequests() {
    Logger.info('Checking for waiting landrequests ready to queue');

    for (let landRequest of await this.queue.getStatusesForWaitingRequests()) {
      const pullRequestId = landRequest.request.pullRequestId;
      let isAllowedToLand = await this.client.isAllowedToLand(pullRequestId);

      if (isAllowedToLand.errors.length === 0) {
        this.moveFromWaitingToQueue(pullRequestId);
      }
    }
  }

  private getUsersPermissions = async (requestingUser: ISessionUser): Promise<IPermission[]> => {
    // TODO: Figure out how to use distinct
    const perms = await Permission.findAll<Permission>({
      order: [['dateAssigned', 'DESC']],
    });

    // Need to get only the latest record for each user
    const aaidPerms: Record<string, Permission> = {};
    for (const perm of perms) {
      if (
        !aaidPerms[perm.aaid] ||
        aaidPerms[perm.aaid].dateAssigned.getTime() < perm.dateAssigned.getTime()
      ) {
        aaidPerms[perm.aaid] = perm;
      }
    }

    // Now we need to filter to only show the records that the requesting user is allowed to see
    const allowedToLand: RunnerState['usersAllowedToLand'] = [];
    const requestingUserMode = await permissionService.getPermissionForUser(requestingUser.aaid);
    for (const aaid of Object.keys(aaidPerms)) {
      // admins see all users
      if (requestingUserMode === 'admin') {
        allowedToLand.push(aaidPerms[aaid]);
        // land users can see land and admin users
      } else if (requestingUserMode === 'land' && aaidPerms[aaid].mode !== 'read') {
        allowedToLand.push(aaidPerms[aaid]);
        // read users can only see admins
      } else if (requestingUserMode === 'read' && aaidPerms[aaid].mode === 'admin') {
        allowedToLand.push(aaidPerms[aaid]);
      }
    }

    return allowedToLand;
  };

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
  };

  async getHistory(page: number) {
    return this.history.getHistory(page);
  }

  async getInstallationIfExists() {
    const install = await Installation.findOne();
    return install;
  }

  async deleteInstallation() {
    await Installation.truncate();
  }

  async getState(requestingUser: ISessionUser): Promise<RunnerState> {
    const [
      daysSinceLastFailure,
      pauseState,
      queue,
      usersAllowedToLand,
      waitingToQueue,
    ] = await Promise.all([
      this.getDatesSinceLastFailures(),
      this.getPauseState(),
      this.queue.getStatusesForQueuedRequests(),
      this.getUsersPermissions(requestingUser),
      this.queue.getStatusesForWaitingRequests(),
    ]);
    return {
      daysSinceLastFailure,
      pauseState,
      queue,
      usersAllowedToLand,
      waitingToQueue,
      bitbucketBaseUrl: `https://bitbucket.org/${this.config.repoConfig.repoOwner}/${
        this.config.repoConfig.repoName
      }`,
    };
  }
}
