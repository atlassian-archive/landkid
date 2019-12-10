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
  UserNote,
  LandRequestStatus,
  MessageStateTransition,
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
    const triggererUserMode = await permissionService.getPermissionForUser(
      landRequest.triggererAaid,
    );
    const commit = landRequest.forCommit;
    const isAllowedToLand = await this.client.isAllowedToLand(
      landRequest.pullRequestId,
      triggererUserMode,
    );

    if (isAllowedToLand.errors.length === 0) {
      Logger.info('Moving from queued to running', { landRequest: landRequest.get() });
      const running = await this.getRunning();
      const dependencies = running.map(queueItem => queueItem.request.id).join(',');
      Logger.info('getting dependencies', { dependencies });

      const buildId = await this.client.createLandBuild(commit);
      if (!buildId) return; // TODO: this should be an error? o.O

      await landRequest.setStatus('running');

      landRequest.buildId = buildId;
      landRequest.dependsOn = dependencies;
      await landRequest.save();
    }
  };

  // Next must always return early if ever doing a single state transition
  next = async () => {
    await withLock('Runner:next', async () => {
      const queue = await this.queue.getQueue();
      Logger.info('Next() called', { queue });

      for (const landRequest of queue) {
        if (landRequest.state === 'awaiting-merge') {
          const dependencies = await landRequest.request.getDependencies();
          console.log('wants to merge, getting deps');
          console.log(dependencies);
        } else if (landRequest.state === 'queued') {
          return await this.moveFromQueueToRunning(landRequest.request);
        }
      }

      // check if there is something else in the queue
      // const maxConcurrentBuilds = 2;
      // for (const queuedStatus of queued) {
      //   if (this.getRunningOld.length >= maxConcurrentBuilds) {
      //     Logger.info('Not adding new builds from queue, running at maxConcurrentBuilds', {
      //       maxConcurrentBuilds,
      //     });
      //     break;
      //   }
      //   const landRequest = queuedStatus.request;
      //   Logger.info('Checking if still allowed to land...', {
      //     landRequest: landRequest.get(),
      //   });

      //   const commit = landRequest.forCommit;

      //     Logger.info('Land build now running', { running: landRequest.get() });
      //   } else {
      //     Logger.info('Land request is not allowed to land', {
      //       ...isAllowedToLand,
      //       ...landRequest.get(),
      //     });
      //     await landRequest.setStatus('fail', 'Land request did not pass land checks');
      //     // this.next();
      //   }
      // }
    });
  };

  // onStatusUpdate only updates status' for landrequests, never moves a state and always exits early
  onStatusUpdate = async (statusEvent: BB.BuildStatusEvent) => {
    const queue = await this.queue.getQueue();
    if (queue.length) {
      Logger.info('No builds running, status event is irrelevant', { statusEvent });
      return;
    }
    for (const landRequest of queue) {
      if (statusEvent.buildId !== landRequest.request.buildId) continue; // check next landRequest
      switch (statusEvent.buildStatus) {
        case 'SUCCESSFUL':
          Logger.info('Moving landRequest to awaiting-merge state', { landRequest });
          return await landRequest.request.setStatus('awaiting-merge');
        case 'FAILED':
          Logger.info('Moving landRequest to failed state', { landRequest });
          return await landRequest.request.setStatus('fail', 'Landkid build failed');
        case 'STOPPED':
          Logger.info('Moving landRequest to aborted state', { landRequest });
          return await landRequest.request.setStatus(
            'aborted',
            'Landkid pipelines build was stopped',
          );
        default:
          Logger.info('Dont know what to do with build status, ignoring', { statusEvent });
          break;
      }
    }
  };

  cancelTopOfTheQueueBuild = async (user: ISessionUser) => {
    const running = await this.getRunningOld();
    if (!running || !running.length) return;
    const topOfTheQueue = running[0];
    await topOfTheQueue.request.setStatus(
      'aborted',
      `Cancelled by user "${user.aaid}" (${user.displayName})`,
    );
    if (topOfTheQueue.request.buildId) {
      this.client.stopLandBuild(topOfTheQueue.request.buildId);
    }
  };

  pause = async (reason: string, user: ISessionUser) => {
    await PauseStateTransition.create<PauseStateTransition>({
      paused: true,
      reason,
      pauserAaid: user.aaid,
    });
  };

  unpause = async (user: ISessionUser) => {
    await PauseStateTransition.create<PauseStateTransition>({
      paused: false,
      pauserAaid: user.aaid,
    });
  };

  getPauseState = async (): Promise<IPauseState> => {
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

  sendBannerMessage = async (
    message: string,
    messageType: IMessageState['messageType'],
    user: ISessionUser,
  ) => {
    await MessageStateTransition.create<MessageStateTransition>({
      senderAaid: user.aaid,
      messageExists: true,
      message,
      messageType,
    });
  };

  removeBannerMessage = async (user: ISessionUser) => {
    await MessageStateTransition.create<MessageStateTransition>({
      senderAaid: user.aaid,
      messageExists: false,
    });
  };

  getBannerMessageState = async (): Promise<IMessageState> => {
    const state = await MessageStateTransition.findOne<MessageStateTransition>({
      order: [['date', 'DESC']],
    });
    if (!state) {
      return {
        id: '_',
        senderAaid: '',
        messageExists: false,
        message: null,
        messageType: null,
        date: new Date(0),
      };
    }
    return state.get();
  };

  private createRequestFromOptions = async (landRequestOptions: LandRequestOptions) => {
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
        targetBranch: landRequestOptions.prTargetBranch,
      }));

    return await LandRequest.create<LandRequest>({
      triggererAaid: landRequestOptions.triggererAaid,
      pullRequestId: pr.prId,
      forCommit: landRequestOptions.commit,
    });
  };

  removeLandRequestByPullRequestId = async (pullRequestId: number, user: ISessionUser) => {
    const requests = await LandRequest.findAll<LandRequest>({
      where: {
        pullRequestId,
      },
    });
    for (const request of requests) {
      await request.setStatus('aborted', `Cancelled by user: "${user.aaid}" (${user.displayName})`);
    }
  };

  enqueue = async (landRequestOptions: LandRequestOptions): Promise<void> => {
    // TODO: Ensure no land request is pending for this PR
    if ((await this.getPauseState()).paused) return;

    const request = await this.createRequestFromOptions(landRequestOptions);
    await request.setStatus('queued');
  };

  addToWaitingToLand = async (landRequestOptions: LandRequestOptions) => {
    // TODO: Ensure no land request is pending for this PR
    if ((await this.getPauseState()).paused) return;
    const request = await this.createRequestFromOptions(landRequestOptions);
    await request.setStatus('will-queue-when-ready');

    this.checkWaitingLandRequests();
  };

  moveFromWaitingToQueue = async (pullRequestId: number) => {
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

  removeLandRequestFromQueue = async (requestId: number, user: ISessionUser): Promise<boolean> => {
    const landRequestInfo = await this.queue.maybeGetStatusForQueuedRequestById(requestId);
    if (!landRequestInfo) return false;

    await landRequestInfo.request.setStatus(
      'aborted',
      `Removed from queue by user "${user.aaid}" (${user.displayName})`,
    );
    Logger.info('Removing landRequest from queue', { landRequestInfo });
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
        this.moveFromWaitingToQueue(pullRequestId);
      }
    }
  };

  private getUsersPermissions = async (requestingUser: ISessionUser): Promise<UserState[]> => {
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
    const requestingUserMode = await permissionService.getPermissionForUser(requestingUser.aaid);
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

  addFakeLandRequest = async (prIdStr: string, commit: string) => {
    const prId = parseInt(prIdStr, 10);
    const landRequest: LandRequestOptions = {
      prId,
      triggererAaid: 'fake-aaid',
      commit,
      prTitle: 'Fake PR title',
      prAuthorAaid: 'faka-landing-aaid',
      prTargetBranch: 'fake-branch-name',
    };
    await this.enqueue(landRequest);

    return landRequest;
  };

  getState = async (requestingUser: ISessionUser): Promise<RunnerState> => {
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
      this.queue.getQueue(),
      this.getUsersPermissions(requestingUser),
      this.queue.getStatusesForWaitingRequests(),
      this.getBannerMessageState(),
    ]);
    return {
      daysSinceLastFailure,
      pauseState,
      queue,
      users,
      waitingToQueue,
      bannerMessageState,
      bitbucketBaseUrl: `https://bitbucket.org/${this.config.repoConfig.repoOwner}/${
        this.config.repoConfig.repoName
      }`,
    };
  };
}
