import { LandRequestQueue } from './Queue';
import { BitbucketClient } from '../bitbucket/BitbucketClient';
import { LandRequestHistory } from './History';
import { Logger } from './Logger';
import { RunnerState, Config, LandRequestOptions } from '../types';
import { withLock } from './utils/locker';
import {
  Installation,
  LandRequest,
  PauseState,
  PullRequest,
  Permission,
  UserNote,
  LandRequestStatus,
  BannerMessageState,
} from '../db';
import { permissionService } from './PermissionService';

// const MAX_WAITING_TIME_FOR_PR_MS = 2 * 24 * 60 * 60 * 1000; // 2 days - max time build can "land-when able"

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

    setInterval(() => {
      this.next();
    }, 15 * 1000); // 15s
  }

  getMaxConcurrentBuilds = () =>
    this.config.maxConcurrentBuilds && this.config.maxConcurrentBuilds > 0
      ? this.config.maxConcurrentBuilds
      : 1;

  getQueue = async () => {
    return this.queue.getQueue();
  };

  getRunning = async () => {
    return this.queue.getRunning();
  };

  moveFromQueueToRunning = async (landRequestStatus: LandRequestStatus, lockId: Date) => {
    const landRequest = landRequestStatus.request;
    const running = await this.getRunning();
    const runningTargetingSameBranch = running.filter(
      build => build.request.pullRequest.targetBranch === landRequest.pullRequest.targetBranch,
    );
    const maxConcurrentBuilds = this.getMaxConcurrentBuilds();
    if (runningTargetingSameBranch.length >= maxConcurrentBuilds) {
      Logger.verbose('No concurrent build slots left', {
        namespace: 'lib:runner:moveFromQueueToRunning',
        landRequestId: landRequest.id,
        pullRequestId: landRequest.pullRequestId,
        landRequestStatus,
        runningTargetingSameBranch,
        maxConcurrentBuilds,
        lockId,
      });
      return false;
    }

    const triggererUserMode = await permissionService.getPermissionForUser(
      landRequest.triggererAaid,
    );
    const commit = landRequest.forCommit;
    const isAllowedToLand = await this.client.isAllowedToLand(
      landRequest.pullRequestId,
      triggererUserMode,
    );

    // ToDo: Extra checks, should probably not be here, but this will do for now
    const currentPrInfo = await this.client.bitbucket.getPullRequest(landRequest.pullRequestId);
    const targetBranchMatches = currentPrInfo.targetBranch === landRequest.pullRequest.targetBranch;
    const commitMatches = currentPrInfo.commit === landRequest.forCommit;
    if (!targetBranchMatches) {
      Logger.info('Target branch changed between landing and running', {
        namespace: 'lib:runner:moveFromQueueToRunning',
        landRequestId: landRequest.id,
        pullRequestId: landRequest.pullRequestId,
        landRequestStatus,
        currentPrTargetBranch: currentPrInfo.targetBranch,
        lockId,
      });
      return landRequest.setStatus('aborted', 'Target branch changed between landing and running');
    }
    if (!commitMatches) {
      Logger.info('Target branch changed between landing and running', {
        namespace: 'lib:runner:moveFromQueueToRunning',
        landRequestId: landRequest.id,
        pullRequestId: landRequest.pullRequestId,
        landRequestStatus,
        currentPrCommit: currentPrInfo.commit,
        lockId,
      });
      return landRequest.setStatus('aborted', 'PR commit changed between landing and running');
    }

    if (isAllowedToLand.errors.length > 0) {
      Logger.error('LandRequest no longer passes land checks', {
        namespace: 'lib:runner:moveFromQueueToRunning',
        errors: isAllowedToLand.errors,
        landRequestStatus,
        pullRequestId: landRequest.pullRequestId,
        landRequestId: landRequest.id,
        lockId,
      });
      return landRequest.setStatus('fail', 'Unable to land due to failed land checks');
    }

    const dependencies = [];
    for (const queueItem of runningTargetingSameBranch) {
      if ((await queueItem.request.getFailedDependencies()).length === 0) {
        dependencies.push(queueItem);
      }
    }

    // Dependencies will be all `running` or `awaiting-merge` builds that target the same branch
    // as yourself
    const dependsOnStr = dependencies.map(queueItem => queueItem.request.id).join(',');

    Logger.info('Attempting to move from queued to running', {
      namespace: 'lib:runner:moveFromQueueToRunning',
      landRequestId: landRequest.id,
      pullRequestId: landRequest.pullRequestId,
      landRequestStatus,
      dependsOn: dependsOnStr,
      lockId,
    });

    const buildId = await this.client.createLandBuild(
      landRequest.id,
      commit,
      {
        dependencyCommits: dependencies.map(queueItem => queueItem.request.forCommit),
        targetBranch: landRequest.pullRequest.targetBranch,
      },
      lockId,
    );
    if (!buildId) {
      Logger.verbose('Unable to create land build in Pipelines', {
        namespace: 'lib:runner:moveFromQueueToRunning',
        landRequestId: landRequest.id,
        pullRequestId: landRequest.pullRequestId,
        landRequestStatus,
        lockId,
      });
      return landRequest.setStatus('fail', 'Unable to create land build in Pipelines');
    }

    let depPrsStr: string | undefined = undefined;
    if (dependencies.length > 0) {
      depPrsStr =
        'Started with PR dependencies: ' +
        dependencies.map(queueItem => queueItem.request.pullRequestId).join(', ');
    }

    await landRequest.setStatus('running', depPrsStr);

    // Todo: these should really be functions on landRequest
    landRequest.buildId = buildId;
    landRequest.dependsOn = dependsOnStr;
    const newLandRequest = await landRequest.save();

    Logger.info('LandRequest now running', {
      namespace: 'lib:runner:moveFromQueueToRunning',
      landRequestId: newLandRequest.id,
      pullRequestId: landRequest.pullRequestId,
      landRequest: newLandRequest,
      buildId,
      lockId,
    });
    return true;
  };

  moveFromAwaitingMerge = async (landRequestStatus: LandRequestStatus, lockId: Date) => {
    const landRequest = landRequestStatus.request;
    const dependencies = await landRequest.getDependencies();

    if (!dependencies.every(dep => dep.statuses[0].state === 'success')) {
      Logger.info('LandRequest is awaiting-merge but still waiting on dependencies', {
        namespace: 'lib:runner:moveFromAwaitingMerge',
        pullRequestId: landRequest.pullRequestId,
        landRequestId: landRequest.id,
        landRequestStatus,
        dependencies,
        lockId,
      });
      return false; // did not move state, return false
    }

    // Try to merge PR
    try {
      const pullRequestId = landRequest.pullRequestId;
      Logger.verbose('Attempting merge pull request', {
        namespace: 'lib:runner:moveFromAwaitingMerge',
        pullRequestId,
        landRequestId: landRequest.id,
        lockId,
      });
      await this.client.mergePullRequest(landRequestStatus);
      Logger.info('Successfully merged PR', {
        namespace: 'lib:runner:moveFromAwaitingMerge',
        landRequestId: landRequest.id,
        pullRequestId,
        lockId,
      });
      const user = await this.client.getUser(landRequest.triggererAaid);
      return landRequest.setStatus('success', `Landed by ${user.displayName || user.aaid}`);
    } catch (err) {
      return landRequest.setStatus('fail', 'Unable to merge pull request');
    }
  };

  // Next must always return early if ever doing a single state transition
  next = async () => {
    await withLock('status-transition', async (lockId: Date) => {
      const queue = await this.queue.getQueue();
      Logger.info('Next() called', {
        namespace: 'lib:runner:next',
        lockId,
        queue,
      });

      for (const landRequestStatus of queue) {
        // Check for this _before_ looking at the state so that we don't have to wait until
        const landRequest = landRequestStatus.request;
        const failedDeps = await landRequest.getFailedDependencies();
        if (failedDeps.length !== 0) {
          Logger.info('LandRequest failed due to failing dependency', {
            namespace: 'lib:runner:next',
            lockId,
            landRequestId: landRequest.id,
            pullRequestId: landRequest.pullRequestId,
            landRequestStatus,
            failedDeps,
          });
          const failedPrIds = failedDeps.map(d => d.request.pullRequestId).join(', ');
          const failReason = `Failed due to failed dependency builds: ${failedPrIds}`;
          await landRequest.setStatus('fail', failReason);
          await landRequest.update({ dependsOn: null });
          await this.client.stopLandBuild(landRequest.buildId, lockId);
          const user = await this.client.getUser(landRequest.triggererAaid);
          return landRequest.setStatus('queued', `queued by ${user.displayName || user.aaid}`);
        }
        if (landRequestStatus.state === 'awaiting-merge') {
          const didChangeState = await this.moveFromAwaitingMerge(landRequestStatus, lockId);
          // if we moved, we need to exit early, otherwise, just keep checking the queue
          if (didChangeState) return this.next();
        } else if (landRequestStatus.state === 'queued') {
          const movedState = await this.moveFromQueueToRunning(landRequestStatus, lockId);
          // if the landrequest was able to move from queued to running, exit early, otherwise, keep
          // checking the rest of the queue
          if (movedState) return this.next();
        }
        // otherwise, we must just be running, nothing to do here
      }
    });
  };

  // onStatusUpdate only updates status' for landrequests, never moves a state and always exits early
  onStatusUpdate = async (statusEvent: BB.BuildStatusEvent) => {
    const running = await this.getRunning();
    if (!running.length) {
      Logger.info('No builds running, status event is irrelevant', {
        namespace: 'lib:runner:onStatusUpdate',
        statusEvent,
      });
      return;
    }
    for (const landRequestStatus of running) {
      const landRequest = landRequestStatus.request;
      if (statusEvent.buildId !== landRequest.buildId) continue; // check next landRequest
      switch (statusEvent.buildStatus) {
        case 'SUCCESSFUL':
          Logger.info('Moving landRequest to awaiting-merge state', {
            namespace: 'lib:runner:onStatusUpdate',
            landRequestId: landRequest.id,
            pullRequestId: landRequest.pullRequestId,
            landRequestStatus,
          });
          await landRequest.setStatus('awaiting-merge');
          return this.next();
        case 'FAILED':
          Logger.info('Moving landRequest to failed state', {
            namespace: 'lib:runner:onStatusUpdate',
            landRequestId: landRequest.id,
            pullRequestId: landRequest.pullRequestId,
            landRequestStatus,
          });
          await landRequest.setStatus('fail', 'Landkid build failed');
          return this.next();
        case 'STOPPED':
          Logger.info('Moving landRequest to aborted state', {
            namespace: 'lib:runner:onStatusUpdate',
            landRequestId: landRequest.id,
            pullRequestId: landRequest.pullRequestId,
            landRequestStatus,
          });
          await landRequest.setStatus('aborted', 'Landkid pipelines build was stopped');
          return this.next();
        default:
          Logger.info('Dont know what to do with build status, ignoring', {
            namespace: 'lib:runner:onStatusUpdate',
            statusEvent,
          });
          break;
      }
    }
  };

  cancelRunningBuild = async (requestId: string, user: ISessionUser): Promise<boolean> => {
    const running = await this.getRunning();
    if (!running || !running.length) return false;

    const landRequestStatus = running.find(status => status.requestId === requestId);
    if (!landRequestStatus) return false;

    await landRequestStatus.request.setStatus(
      'aborted',
      `Cancelled by user "${user.displayName || user.aaid}"`,
    );
    if (landRequestStatus.request.buildId) {
      return this.client.stopLandBuild(landRequestStatus.request.buildId);
    } else {
      return false;
    }
  };

  pause = async (reason: string, user: ISessionUser) => {
    await this.unpause();
    await PauseState.create<PauseState>({
      pauserAaid: user.aaid,
      reason,
    });
  };

  unpause = async () => {
    await PauseState.truncate();
  };

  getPauseState = async (): Promise<IPauseState | null> => {
    const state = await PauseState.findOne<PauseState>();
    return state ? state.get() : null;
  };

  addBannerMessage = async (
    message: string,
    messageType: IMessageState['messageType'],
    user: ISessionUser,
  ) => {
    await this.removeBannerMessage();
    await BannerMessageState.create<BannerMessageState>({
      senderAaid: user.aaid,
      message,
      messageType,
    });
  };

  removeBannerMessage = async () => {
    await BannerMessageState.truncate();
  };

  getBannerMessageState = async (): Promise<IMessageState | null> => {
    const state = await BannerMessageState.findOne<BannerMessageState>();
    return state ? state.get() : null;
  };

  private createRequestFromOptions = async (landRequestOptions: LandRequestOptions) => {
    let pr = await PullRequest.findOne<PullRequest>({
      where: {
        prId: landRequestOptions.prId,
      },
    });
    if (!pr) {
      pr = await PullRequest.create<PullRequest>({
        prId: landRequestOptions.prId,
        authorAaid: landRequestOptions.prAuthorAaid,
        title: landRequestOptions.prTitle,
      });
    }
    // Unfortunately, because we decided to make PR id's be the primary key, we need this
    // hack to update target branches in case a PR relands with a new target branch
    pr.targetBranch = landRequestOptions.prTargetBranch;
    await pr.save();

    return LandRequest.create<LandRequest>({
      triggererAaid: landRequestOptions.triggererAaid,
      pullRequestId: pr.prId,
      forCommit: landRequestOptions.commit,
    });
  };

  enqueue = async (landRequestOptions: LandRequestOptions): Promise<void> => {
    // TODO: Ensure no land request is pending for this PR
    if (await this.getPauseState()) return;
    const request = await this.createRequestFromOptions(landRequestOptions);
    const user = await this.client.getUser(request.triggererAaid);
    return request.setStatus('queued', `queued by ${user.displayName || user.aaid}`);
  };

  addToWaitingToLand = async (landRequestOptions: LandRequestOptions) => {
    // TODO: Ensure no land request is pending for this PR
    if (await this.getPauseState()) return;
    const request = await this.createRequestFromOptions(landRequestOptions);
    await request.setStatus('will-queue-when-ready');

    this.checkWaitingLandRequests();
  };

  moveFromWaitingToQueued = async (pullRequestId: number) => {
    if (await this.getPauseState()) return;

    const requests = await LandRequest.findAll<LandRequest>({
      where: {
        pullRequestId,
      },
    });
    for (const request of requests) {
      const status = await request.getStatus();
      if (status && status.state !== 'will-queue-when-ready') continue;

      const user = await this.client.getUser(request.triggererAaid);
      await request.setStatus('queued', `queued by ${user.displayName || user.aaid}`);
    }
    Logger.info('Moving landRequests from waiting to queue', {
      namespace: 'lib:runner:moveFromWaitingToQueued',
      requests,
    });

    this.next();
  };

  removeLandRequestFromQueue = async (requestId: string, user: ISessionUser): Promise<boolean> => {
    const landRequestStatus = await this.queue.maybeGetStatusForQueuedRequestById(requestId);
    if (!landRequestStatus) return false;

    const displayName = user.displayName || user.aaid;
    await landRequestStatus.request.setStatus(
      'aborted',
      `Removed from queue by user "${displayName}"`,
    );
    Logger.info('Removing landRequest from queue', {
      namespace: 'lib:removeLandRequestFromQueue',
      landRequestId: landRequestStatus.requestId,
      landRequestStatus,
    });
    return true;
  };

  moveRequestToTopOfQueue = async (requestId: string, user: ISessionUser): Promise<boolean> => {
    const landRequestStatus = await this.queue.maybeGetStatusForQueuedRequestById(requestId);
    if (!landRequestStatus) return false;

    const queue = await this.getQueue();
    if (queue.length === 0) return true;

    const requestAtTop = queue[0];
    const topDate = new Date(requestAtTop.date.getTime() - 1);

    await landRequestStatus.request.setStatus(
      'queued',
      `moved to the top of the queue by user ${user.aaid}`,
      topDate,
    );
    return true;
  };

  checkWaitingLandRequests = async () => {
    await withLock('status-transition', async () => {
      Logger.info('Checking for waiting landrequests ready to queue', {
        namespace: 'lib:runner:checkWaitingLandRequests',
      });

      for (let landRequestStatus of await this.queue.getStatusesForWaitingRequests()) {
        const landRequest = landRequestStatus.request;
        const pullRequestId = landRequest.pullRequestId;
        const triggererUserMode = await permissionService.getPermissionForUser(
          landRequest.triggererAaid,
        );
        const isAllowedToLand = await this.client.isAllowedToLand(pullRequestId, triggererUserMode);

        if (isAllowedToLand.errors.length === 0) {
          const queue = await this.getQueue();
          const existingBuild = queue.find(
            q => q.request.pullRequestId === landRequest.pullRequestId,
          );
          if (existingBuild) {
            Logger.warn('Already has existing Land build', {
              pullRequestId,
              landRequestId: landRequest.id,
              landRequestStatus,
              existingBuild,
              namespace: 'lib:runner:checkWaitingLandRequests',
            });
            await landRequest.setStatus('aborted', 'Already has existing Land build');
            continue;
          }
          await this.moveFromWaitingToQueued(pullRequestId);
        }
      }
    });
  };

  getStatusesForLandRequests = async (
    requestIds: string[],
  ): Promise<{ [id: string]: LandRequestStatus[] }> => {
    const statuses: { [id: string]: LandRequestStatus[] } = {};
    for (const requestId of requestIds) {
      const landRequestStatuses = await LandRequestStatus.findAll<LandRequestStatus>({
        where: {
          requestId,
        },
        order: [['date', 'ASC']],
        include: [
          {
            model: LandRequest,
            include: [PullRequest],
          },
        ],
      });
      statuses[requestId] = landRequestStatuses;
    }
    return statuses;
  };

  private getUsersPermissions = async (
    requestingUserMode: IPermissionMode,
  ): Promise<UserState[]> => {
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

    const aaidNotes: Record<string, string> = {};
    if (requestingUserMode === 'admin') {
      const notes = await UserNote.findAll<UserNote>();
      for (const note of notes) {
        aaidNotes[note.aaid] = note.note;
      }
    }

    // Now we need to filter to only show the records that the requesting user is allowed to see
    const users: UserState[] = [];
    for (const aaid of Object.keys(aaidPerms)) {
      // admins see all users
      if (requestingUserMode === 'admin') {
        users.push({
          aaid,
          mode: aaidPerms[aaid].mode,
          dateAssigned: aaidPerms[aaid].dateAssigned,
          assignedByAaid: aaidPerms[aaid].assignedByAaid,
          note: aaidNotes[aaid],
        });
        // land users can see land and admin users
      } else if (requestingUserMode === 'land' && aaidPerms[aaid].mode !== 'read') {
        users.push(aaidPerms[aaid]);
        // read users can only see admins
      } else if (requestingUserMode === 'read' && aaidPerms[aaid].mode === 'admin') {
        users.push(aaidPerms[aaid]);
      }
    }

    return users;
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

  getHistory = async (page: number) => {
    return this.history.getHistory(page);
  };

  getInstallationIfExists = async () => {
    const install = await Installation.findOne();
    return install;
  };

  deleteInstallation = async () => {
    await Installation.truncate();
  };

  clearHistory = async () => {
    Logger.info('Clearing LandRequest History', { namespace: 'lib:runner:clearHistory' });
    await LandRequestStatus.truncate();
    await LandRequest.truncate();
    await PullRequest.truncate();
  };

  getState = async (requestingUser: ISessionUser): Promise<RunnerState> => {
    const requestingUserMode = await permissionService.getPermissionForUser(requestingUser.aaid);
    const [
      daysSinceLastFailure,
      pauseState,
      queue,
      users,
      waitingToQueue,
      bannerMessageState,
    ] = await Promise.all([
      this.getDatesSinceLastFailures(),
      this.getPauseState(),
      requestingUserMode === 'read' ? [] : this.getQueue(),
      this.getUsersPermissions(requestingUserMode),
      requestingUserMode === 'read' ? [] : this.queue.getStatusesForWaitingRequests(),
      this.getBannerMessageState(),
    ]);
    // We are ignoring errors because the IDE thinks all returned values can be null
    // However, this is operating as intended
    return {
      // @ts-ignore
      daysSinceLastFailure,
      pauseState,
      // @ts-ignore
      queue,
      // @ts-ignore
      users,
      // @ts-ignore
      waitingToQueue,
      bannerMessageState,
      bitbucketBaseUrl: `https://bitbucket.org/${this.config.repoConfig.repoOwner}/${
        this.config.repoConfig.repoName
      }`,
      permissionsMessage: this.config.permissionsMessage,
    };
  };
}
