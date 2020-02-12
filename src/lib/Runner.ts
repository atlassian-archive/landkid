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
  maxConcurrentBuilds: number;

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

    this.maxConcurrentBuilds =
      config.maxConcurrentBuilds && config.maxConcurrentBuilds > 0 ? config.maxConcurrentBuilds : 1;
  }

  // old function, will remove once not used
  getRunningOld = async () => {
    return this.queue.maybeGetStatusForRunningRequests();
  };

  getQueue = async () => {
    return this.queue.getQueue();
  };

  getRunning = async () => {
    return this.queue.getRunning();
  };

  moveFromQueueToRunning = async (landRequest: LandRequest) => {
    const running = await this.getRunning();
    if (running.length >= this.maxConcurrentBuilds) return false;

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
      return landRequest.setStatus('aborted', 'Target branch changed between landing and running');
    }
    if (!commitMatches) {
      return landRequest.setStatus('aborted', 'PR commit changed between landing and running');
    }

    if (isAllowedToLand.errors.length === 0) {
      Logger.info('Moving from queued to running', { landRequest: landRequest.get() });
      // Dependencies will be all `running` or `awaiting-merge` builds that target the same branch
      // as yourself
      const dependencies = running.filter(
        build => build.request.pullRequest.targetBranch === landRequest.pullRequest.targetBranch,
      );
      const dependsOnStr = dependencies.map(queueItem => queueItem.request.id).join(',');
      const depCommitsArrStr = JSON.stringify(
        dependencies.map(queueItem => queueItem.request.forCommit),
      );

      const buildId = await this.client.createLandBuild(commit, depCommitsArrStr);
      if (!buildId) {
        return await landRequest.setStatus('fail', 'Unable to create land build in Pipelines');
      }

      Logger.info('LandRequest now running', {
        dependsOnStr,
        landRequest,
        buildId,
        depCommitsArrStr,
      });
      await landRequest.setStatus('running');

      // Todo: these should really be functions on landRequest
      landRequest.buildId = buildId;
      landRequest.dependsOn = dependsOnStr;
      await landRequest.save();
      return true;
    }
    Logger.error('LandRequest no longer passes land checks', {
      errors: isAllowedToLand.errors,
      landRequest,
    });
    return landRequest.setStatus('fail', 'Unable to land due to failed land checks');
  };

  attemptToMoveFromAwaitingMerge = async (landRequest: LandRequestStatus) => {
    const dependencies = await landRequest.request.getDependencies();

    if (!dependencies.every(dep => dep.statuses[0].state === 'success')) {
      Logger.info('LandRequest is awaiting-merge but still waiting on dependencies', {
        dependencies,
        landRequest,
      });
      return false; // did not move state, return false
    }

    // Try to merge PR
    try {
      const pullRequestId = landRequest.request.pullRequestId;
      Logger.info('Attempting merge pull request', { pullRequestId, landRequest });
      await this.client.mergePullRequest(
        pullRequestId,
        landRequest.request.pullRequest.targetBranch,
      );
      Logger.info('Successfully merged PR', { pullRequestId });
      return await landRequest.request.setStatus('success');
    } catch (err) {
      return await landRequest.request.setStatus('fail', 'Unable to merge pull request');
    }
  };

  // Next must always return early if ever doing a single state transition
  next = async () => {
    await withLock('Runner:next', async () => {
      const queue = await this.queue.getQueue();
      Logger.info('Next() called', { queue });

      for (const landRequest of queue) {
        // Check for this _before_ looking at the state so that we don't have to wait until
        const failedDeps = await landRequest.request.getFailedDependencies();
        if (failedDeps.length !== 0) {
          Logger.info('LandRequest failed due to failing dependency');
          const failedPrIds = failedDeps.map(d => d.request.pullRequestId).join(', ');
          const failReason = `Failed due to failed dependency builds: ${failedPrIds}`;
          await landRequest.request.setStatus('fail', failReason);
          await landRequest.request.update({ dependsOn: null });
          // await landRequest.request.save();
          return await landRequest.request.setStatus('queued');
        }
        if (landRequest.state === 'awaiting-merge') {
          const didChangeState = await this.attemptToMoveFromAwaitingMerge(landRequest);
          // if we moved, we need to exit early, otherwise, just keep checking the queue
          if (didChangeState) return this.next();
        } else if (landRequest.state === 'queued') {
          const movedState = await this.moveFromQueueToRunning(landRequest.request);
          // if the landrequest was able to move from queued to running, exit early, otherwise, keep
          // checking the rest of the queue
          if (movedState) return this.next();
        }
        // otherwise, we must just be running, nothing to do here
      }
      //
    });
  };

  // onStatusUpdate only updates status' for landrequests, never moves a state and always exits early
  onStatusUpdate = async (statusEvent: BB.BuildStatusEvent) => {
    const running = await this.getRunning();
    if (!running.length) {
      Logger.info('No builds running, status event is irrelevant', { statusEvent });
      return;
    }
    for (const landRequest of running) {
      if (statusEvent.buildId !== landRequest.request.buildId) continue; // check next landRequest
      switch (statusEvent.buildStatus) {
        case 'SUCCESSFUL':
          Logger.info('Moving landRequest to awaiting-merge state', { landRequest });
          await landRequest.request.setStatus('awaiting-merge');
          return this.next();
        case 'FAILED':
          Logger.info('Moving landRequest to failed state', { landRequest });
          await landRequest.request.setStatus('fail', 'Landkid build failed');
          return this.next();
        case 'STOPPED':
          Logger.info('Moving landRequest to aborted state', { landRequest });
          await landRequest.request.setStatus('aborted', 'Landkid pipelines build was stopped');
          return this.next();
        default:
          Logger.info('Dont know what to do with build status, ignoring', { statusEvent });
          break;
      }
    }
  };

  cancelRunningBuild = async (requestId: string, user: ISessionUser): Promise<boolean> => {
    const running = await this.getRunningOld();
    if (!running || !running.length) return false;

    const landRequestStatus = running.find(status => status.requestId === requestId);
    if (!landRequestStatus) return false;

    await landRequestStatus.request.setStatus(
      'aborted',
      `Cancelled by user "${user.aaid}" (${user.displayName})`,
    );
    if (landRequestStatus.request.buildId) {
      return await this.client.stopLandBuild(landRequestStatus.request.buildId);
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

    return await LandRequest.create<LandRequest>({
      triggererAaid: landRequestOptions.triggererAaid,
      pullRequestId: pr.prId,
      forCommit: landRequestOptions.commit,
    });
  };

  enqueue = async (landRequestOptions: LandRequestOptions): Promise<void> => {
    // TODO: Ensure no land request is pending for this PR
    if (await this.getPauseState()) return;

    const request = await this.createRequestFromOptions(landRequestOptions);
    await request.setStatus('queued');
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

      await request.setStatus('queued');
    }
    Logger.info('Moving landRequests from waiting to queue', { requests });

    this.next();
  };

  removeLandRequestFromQueue = async (requestId: string, user: ISessionUser): Promise<boolean> => {
    const landRequestStatus = await this.queue.maybeGetStatusForQueuedRequestById(requestId);
    if (!landRequestStatus) return false;

    const displayName = user.displayName || user.aaid;
    await landRequestStatus.request.setStatus(
      'aborted',
      `Removed from queue by user "${displayName}`,
    );
    Logger.info('Removing landRequest from queue', { landRequestStatus });
    return true;
  };

  moveRequestToTopOfQueue = async (requestId: string, user: ISessionUser): Promise<boolean> => {
    const landRequestStatus = await this.queue.maybeGetStatusForQueuedRequestById(requestId);
    if (!landRequestStatus) return false;
    Logger.info('yeet', { lrs: landRequestStatus });

    const requestAtTop = (await this.getQueue())[0];
    const topDate = new Date(requestAtTop.date.getDate() - 1);

    await landRequestStatus.request.setStatus(
      'queued',
      `moved to the top of the queue by user ${user.aaid}`,
      topDate,
    );
    return true;
  };

  checkWaitingLandRequests = async () => {
    Logger.info('Checking for waiting landrequests ready to queue');

    for (let landRequest of await this.queue.getStatusesForWaitingRequests()) {
      const pullRequestId = landRequest.request.pullRequestId;
      const triggererUserMode = await permissionService.getPermissionForUser(
        landRequest.request.triggererAaid,
      );
      const isAllowedToLand = await this.client.isAllowedToLand(pullRequestId, triggererUserMode);

      if (isAllowedToLand.errors.length === 0) {
        const queue = await this.getQueue();
        const existingBuild = queue.find(
          q => q.request.pullRequestId === landRequest.request.pullRequestId,
        );
        if (existingBuild) {
          await landRequest.request.setStatus('aborted', 'Already have existing Land build');
          continue;
        }
        this.moveFromWaitingToQueued(pullRequestId);
      }
    }
  };

  addFakeLandRequest = async (prIdStr: string, triggererAaid: string) => {
    const prId = parseInt(prIdStr, 10);
    const pr = await this.client.bitbucket.getPullRequest(prId);
    if (!pr) return false;
    const landRequest: LandRequestOptions = {
      prId,
      triggererAaid,
      commit: pr.commit,
      prTitle: pr.title,
      prAuthorAaid: pr.authorAaid,
      prTargetBranch: pr.targetBranch,
    };
    await this.enqueue(landRequest);

    return landRequest;
  };

  getLandRequestStatuses = async (requestId: number): Promise<LandRequestStatus[]> => {
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
    return landRequestStatuses;
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
    Logger.info('Clearing LandRequest History');
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
    };
  };
}
