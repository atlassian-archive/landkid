import mem from 'mem';

import { LandRequestQueue } from './Queue';
import { BitbucketClient } from '../bitbucket/BitbucketClient';
import { LandRequestHistory } from './History';
import { Logger } from './Logger';
import { RunnerState, Config, LandRequestOptions } from '../types';
import { withLock } from './utils/locker';
import { Installation, LandRequest, PullRequest, LandRequestStatus } from '../db';
import { permissionService } from './PermissionService';
import { eventEmitter } from './Events';
import { BitbucketAPI } from '../bitbucket/BitbucketAPI';
import { StateService } from './StateService';
import { validatePriorityBranch } from './utils/helper-functions';
import { SpeculationEngine } from './SpeculationEngine';

// const MAX_WAITING_TIME_FOR_PR_MS = 2 * 24 * 60 * 60 * 1000; // 2 days - max time build can "land-when able"

// `check-waiting-requests` lock will be auto released after the time below
// logs showed that it takes 2 hours and 20 mins to check about 140 waiting requests
// 3 hours should be long enough to complete it now that we only fetch requests within 7 days (about 20 waiting requests)
const MAX_CHECK_WAITING_REQUESTS_TIME = 1000 * 60 * 60 * 3; // 3 hours

const LAND_BUILD_TIMEOUT_TIME = 1000 * 60 * 60 * 2; // 2 hours

export class Runner {
  constructor(
    public queue: LandRequestQueue,
    private history: LandRequestHistory,
    private client: BitbucketClient,
    private config: Config,
  ) {
    this.init();
  }

  // put timers into a seperate class method, which makes it much easier for unit testing
  init() {
    // call our checkWaitingLandRequests() function on an interval so that we are always clearing out waiting builds
    const timeBetweenChecksMins = 2;
    setInterval(() => {
      this.checkWaitingLandRequests();
    }, timeBetweenChecksMins * 60 * 1000);

    setInterval(() => {
      this.next();
    }, 15 * 1000); // 15s

    // call checkRunningLandRequests() function on a interval of 10 min to verify LAND_BUILD_TIMEOUT_TIME
    setInterval(() => {
      this.checkRunningLandRequests();
    }, 10 * 60 * 1000);
  }

  getQueue = async (states?: IStatusState[]) => {
    return this.queue.getQueue(states);
  };

  getRunning = async (states?: IStatusState[]) => {
    return this.queue.getRunning(states);
  };

  getWaitingAndQueued = async () => {
    const queued = await this.getQueue();
    const waiting = await this.queue.getStatusesForWaitingRequests();
    return [...queued, ...waiting];
  };

  areMaxConcurrentBuildsRunning = async (processingLandRequestStatuses: LandRequestStatus[]) => {
    const maxConcurrentBuilds = await StateService.getMaxConcurrentBuilds();
    const running = processingLandRequestStatuses.filter(({ state }) => state === 'running');
    return running.length >= maxConcurrentBuilds;
  };

  moveFromQueueToRunning = async (landRequestStatus: LandRequestStatus, lockId: Date) => {
    if (await StateService.getPauseState()) return;
    const landRequest = landRequestStatus.request;
    const running = await this.getRunning();
    const runningTargetingSameBranch = running.filter(
      (build) => build.request.pullRequest.targetBranch === landRequest.pullRequest.targetBranch,
    );
    if (await this.areMaxConcurrentBuildsRunning(runningTargetingSameBranch)) {
      Logger.verbose('No concurrent build slots left', {
        namespace: 'lib:runner:moveFromQueueToRunning',
        landRequestId: landRequest.id,
        pullRequestId: landRequest.pullRequestId,
        landRequestStatus,
        runningTargetingSameBranch,
        lockId,
      });
      return false;
    }

    const triggererUserMode = await permissionService.getPermissionForUser(
      landRequest.triggererAaid,
    );

    const isAllowedToLand = await this.isAllowedToLand({
      pullRequestId: landRequest.pullRequestId,
      permissionLevel: triggererUserMode,
      queueFetcher: this.getRunning,
      sourceBranch: landRequest.pullRequest.sourceBranch,
      destinationBranch: landRequest.pullRequest.targetBranch,
      commit: landRequest.forCommit,
    });

    if (isAllowedToLand.abortErrors.length > 0) {
      Logger.warn('Aborting queued land request', {
        namespace: 'lib:runner:moveFromQueueToRunning',
        isAllowedToLand,
        landRequestStatus,
        pullRequestId: landRequest.pullRequestId,
        landRequestId: landRequest.id,
        lockId,
        errors: isAllowedToLand.abortErrors,
      });
      return landRequest.setStatus('aborted', isAllowedToLand.abortErrors.join(','));
    }

    if (isAllowedToLand.errors.length > 0) {
      Logger.error('LandRequest no longer passes land checks', {
        namespace: 'lib:runner:moveFromQueueToRunning',
        isAllowedToLand,
        landRequestStatus,
        pullRequestId: landRequest.pullRequestId,
        landRequestId: landRequest.id,
        lockId,
        errors: isAllowedToLand.errors,
      });
      return landRequest.setStatus('fail', 'Unable to land due to failed land checks');
    }

    if (
      await SpeculationEngine.reOrderRequest(
        runningTargetingSameBranch,
        await this.getQueue(['queued']),
        landRequestStatus,
      )
    ) {
      return false;
    }

    const runningExceptSelf = runningTargetingSameBranch.filter(
      // Failsafe to prevent self-dependencies
      (build) => build.request.pullRequestId !== landRequest.pullRequestId,
    );
    const dependencies = [];
    for (const queueItem of runningExceptSelf) {
      if ((await queueItem.request.getFailedDependencies()).length === 0) {
        dependencies.push(queueItem);
      }
    }

    // Dependencies will be all `running` or `awaiting-merge` builds that target the same branch
    // as yourself
    const dependsOnStr = dependencies.map((queueItem) => queueItem.request.id).join(',');

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
      landRequest.forCommit,
      {
        dependencyCommits: dependencies.map((queueItem) => queueItem.request.forCommit),
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
        dependencies.map((queueItem) => queueItem.request.pullRequestId).join(', ');
    }

    // Todo: these should really be functions on landRequest
    landRequest.buildId = buildId;
    landRequest.dependsOn = dependsOnStr;
    await landRequest.setStatus('running', depPrsStr);

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

  moveFromAwaitingMerge = async (
    landRequestStatus: LandRequestStatus,
    lockId: Date,
    dependentsAwaitingMerge: LandRequestStatus[],
  ) => {
    const landRequest = landRequestStatus.request;
    const pullRequest = landRequest.pullRequest;
    const dependencies = await landRequest.getDependencies();

    function log(msg: string, extraProps: Record<string, any> = {}) {
      Logger.info(msg, {
        namespace: 'lib:runner:moveFromAwaitingMerge',
        pullRequestId: landRequest.pullRequestId,
        landRequestId: landRequest.id,
        landRequestStatus,
        ...extraProps,
      });
    }

    if (!dependencies.every((dep) => dep.statuses[0].state === 'success')) {
      log('LandRequest is awaiting-merge but still waiting on dependencies', {
        dependencies,
        lockId,
      });
      return false; // did not move state, return false
    }

    const adminSettings = await StateService.getAdminSettings();
    if (adminSettings?.mergeBlockingEnabled) {
      const isBlockingBuildRunning: BitbucketClient['isBlockingBuildRunning'] = mem(
        this.client.isBlockingBuildRunning.bind(this.client),
        {
          maxAge: 30 * 1000,
        },
      );
      const result = await isBlockingBuildRunning(pullRequest.targetBranch);
      if (result.running) {
        log('LandRequest blocked from merging due to in-progress target branch build', {
          builds: result.pipelines?.map(({ build_number, created_on, state }) => ({
            build_number,
            created_on,
            state,
          })),
        });
        return false;
      } else {
        log('No blocking pipelines running on target branch');
        if (dependentsAwaitingMerge.length === 0) {
          // We are fine to cache successful calls (i.e. no blocking builds running) if there are further PRs in the
          // queue that are awaiting merge since a blocking build shouldn't start when all are merged in quick succession (especially
          // if skipBuildOnDependentsAwaitingMerge is set).
          // However, we shouldn't cache a successful call if there aren't any other PRs in the queue to prevent a PR being merged
          // after a blocking build has started during the 30s cache window.
          // NOTE: This is inefficient as the cache is cleared across all targetBranches but this isn't a major concern as the default
          //       use case is having a single blocking build for only one target branch.
          mem.clear(isBlockingBuildRunning);
        }
      }
    }

    Logger.info('Triggering merge attempt', {
      namespace: 'lib:runner:moveFromAwaitingMerge',
      pullRequestId: landRequest.pullRequestId,
      landRequestId: landRequest.id,
      lockId,
    });

    // Start merge attempt
    await landRequest.setStatus('merging');

    // skip CI if there is a dependent PR that is awaiting merge
    const skipCI =
      dependentsAwaitingMerge.length > 0 &&
      this.config.mergeSettings &&
      this.config.mergeSettings.skipBuildOnDependentsAwaitingMerge;

    const emitEvent = (message: string, extraProps?: {}) => {
      eventEmitter.emit(message, {
        landRequestId: landRequestStatus.requestId,
        pullRequestId: landRequest.pullRequestId,
        commit: landRequest.forCommit,
        sourceBranch: pullRequest.sourceBranch,
        targetBranch: pullRequest.targetBranch,
        ...extraProps,
      });
    };
    this.client
      .mergePullRequest(landRequestStatus, {
        skipCI,
        mergeStrategy: landRequest.mergeStrategy,
        numRetries: 2,
      })
      .then(async (result) => {
        if (result.status === BitbucketAPI.SUCCESS) {
          const end = Date.now();
          const queuedDate = await landRequest.getQueuedDate();
          const start = queuedDate!.getTime();
          emitEvent('PULL_REQUEST.MERGE.SUCCESS', { duration: end - start });
          await landRequest.setStatus('success');
        } else if (result.status === BitbucketAPI.FAILED) {
          emitEvent('PULL_REQUEST.MERGE.FAIL');
          await landRequest.setStatus(
            'fail',
            `Unable to merge pull request: ${result.reason?.error?.message}. ${
              result.reason?.error?.fields?.merge_checks?.join(', ') ?? ''
            }`,
          );
        } else if (result.status === BitbucketAPI.ABORTED) {
          emitEvent('PULL_REQUEST.MERGE.ABORT');
          await landRequest.setStatus(
            'aborted',
            'Merging aborted due to manual cancel (PR may still merge anyway)',
          );
        } else if (result.status === BitbucketAPI.TIMEOUT) {
          emitEvent('PULL_REQUEST.MERGE.POLL_TIMEOUT');
          await landRequest.setStatus(
            'aborted',
            'Merging aborted due to polling exceeding maximum attempts (PR may still merge anyway)',
          );
        }
      });
  };

  failDueToDependency = async (
    landRequestStatus: LandRequestStatus,
    failedDeps: LandRequestStatus[],
    lockId: Date,
  ) => {
    const { request: landRequest } = landRequestStatus;
    Logger.info('LandRequest failed due to failing dependency', {
      namespace: 'lib:runner:next',
      lockId,
      landRequestId: landRequest.id,
      pullRequestId: landRequest.pullRequestId,
      landRequestStatus,
      failedDeps,
    });
    const failedPrIds = failedDeps.map((d) => d.request.pullRequestId).join(', ');
    const failReason = `Failed due to failed dependency builds: ${failedPrIds}`;
    await landRequest.setStatus('fail', failReason);
    await landRequest.update({ dependsOn: null });
    await this.client.stopLandBuild(landRequest.buildId, lockId);
    const user = await this.client.getUser(landRequest.triggererAaid);
    await landRequest.incrementPriority();
    return landRequest.setStatus('queued', `Queued by ${user.displayName || user.aaid}`);
  };

  // Next must always return early if ever doing a single state transition
  next = async () => {
    const runNextAgain = await withLock(
      'status-transition',
      async (lockId: Date) => {
        const queue = await this.queue.getQueue();
        Logger.info('Next() called', {
          namespace: 'lib:runner:next',
          lockId,
          queue,
        });

        for (const landRequestStatus of queue) {
          // Check for this _before_ looking at the state so that we don't have to wait until
          const failedDeps = await landRequestStatus.request.getFailedDependencies();
          if (failedDeps.length !== 0) {
            return this.failDueToDependency(landRequestStatus, failedDeps, lockId);
          }
          if (landRequestStatus.state === 'awaiting-merge') {
            const awaitingMergeQueue = Runner.getDependentsAwaitingMerge(queue, landRequestStatus);
            const didChangeState = await this.moveFromAwaitingMerge(
              landRequestStatus,
              lockId,
              awaitingMergeQueue,
            );
            // if we moved, we need to exit early, otherwise, just keep checking the queue
            if (didChangeState) return true;
          } else if (landRequestStatus.state === 'queued') {
            const didChangeState = await this.moveFromQueueToRunning(landRequestStatus, lockId);
            // if the landrequest was able to move from queued to running, exit early, otherwise, keep
            // checking the rest of the queue
            if (didChangeState) return true;
          }
        }
        return false;
      },
      false,
    );
    if (runNextAgain) {
      await this.next();
    }
  };

  // onStatusUpdate only updates status' for landrequests, never moves a state and always exits early
  onStatusUpdate = async (statusEvent: BB.BuildStatusEvent) => {
    const requests = await this.getRunning();
    const landRequestStatus = requests.find(
      ({ state, request }) => state === 'running' && request.buildId === statusEvent.buildId,
    );

    const landRequest = landRequestStatus?.request;

    if (!landRequest) {
      Logger.info('No running build for status event, ignoring', {
        namespace: 'lib:runner:onStatusUpdate',
        statusEvent,
      });
      return;
    }

    const logMessage = (message: string) =>
      Logger.info(message, {
        namespace: 'lib:runner:onStatusUpdate',
        landRequestId: landRequest.id,
        pullRequestId: landRequest.pullRequestId,
        landRequestStatus,
        statusEvent,
      });

    switch (statusEvent.buildStatus) {
      case 'SUCCESSFUL':
        logMessage('Moving landRequest to awaiting-merge state');
        await landRequest.setStatus('awaiting-merge');
        return this.next();
      case 'FAILED':
        logMessage('Moving landRequest to failed state');
        await landRequest.setStatus('fail', 'Landkid build failed');
        return this.next();
      case 'STOPPED':
        logMessage('Moving landRequest to aborted state');
        await landRequest.setStatus('aborted', 'Landkid pipelines build was stopped');
        return this.next();
      default:
        logMessage('Dont know what to do with build status, ignoring');
        break;
    }
  };

  cancelRunningBuild = async (requestId: string, user: ISessionUser): Promise<boolean> => {
    const running = await this.getRunning();
    if (!running || !running.length) return false;

    const landRequestStatus = running.find((status) => status.requestId === requestId);
    if (!landRequestStatus) return false;

    await landRequestStatus.request.setStatus(
      'aborted',
      `Cancelled by user ${user.displayName || user.aaid}`,
    );
    if (landRequestStatus.request.buildId) {
      await this.client.stopLandBuild(landRequestStatus.request.buildId);
    }
    if (landRequestStatus.state === 'merging') {
      this.client.cancelMergePolling(landRequestStatus.request.pullRequestId);
    }
    return true;
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
        authorAccountId: landRequestOptions.prAuthorAccountId,
        title: landRequestOptions.prTitle,
      });
    }
    // Unfortunately, because we decided to make PR id's be the primary key, we need this
    // hack to update target branches in case a PR relands with a new target branch
    pr.targetBranch = landRequestOptions.prTargetBranch;
    pr.sourceBranch = landRequestOptions.prSourceBranch;
    await pr.save();

    return LandRequest.create<LandRequest>(
      {
        triggererAaid: landRequestOptions.triggererAaid,
        triggererAccountId: landRequestOptions.triggererAccountId,
        pullRequestId: pr.prId,
        forCommit: landRequestOptions.commit,
        mergeStrategy: landRequestOptions.mergeStrategy,
      },
      {
        include: [PullRequest],
      },
    );
  };

  enqueue = async (landRequestOptions: LandRequestOptions) => {
    // TODO: Ensure no land request is pending for this PR
    if (await StateService.getPauseState()) return;
    const request = await this.createRequestFromOptions(landRequestOptions);
    const user = await this.client.getUser(request.triggererAaid);
    await request.setStatus('queued', `Queued by ${user.displayName || user.aaid}`);
    return request;
  };

  addToWaitingToLand = async (landRequestOptions: LandRequestOptions) => {
    // TODO: Ensure no land request is pending for this PR
    if (await StateService.getPauseState()) return;
    const request = await this.createRequestFromOptions(landRequestOptions);
    await request.setStatus('will-queue-when-ready');

    this.checkWaitingLandRequests();
    return request;
  };

  moveFromWaitingToQueued = async (landRequestStatus: LandRequestStatus) => {
    if (await StateService.getPauseState()) return false;

    Logger.info('Moving land request from waiting to queue', {
      namespace: 'lib:runner:moveFromWaitingToQueued',
      landRequestStatus,
      landRequestId: landRequestStatus.requestId,
      pullRequestId: landRequestStatus.request.pullRequestId,
    });

    const {
      request,
      request: {
        pullRequest: { sourceBranch },
      },
    } = landRequestStatus;

    const priorityBranches = await StateService.getPriorityBranches();
    const isPriorityBranch = validatePriorityBranch(priorityBranches, sourceBranch);
    if (isPriorityBranch) {
      await request.incrementPriority();
      Logger.info(`Priority increased as ${sourceBranch} is a priority branch.`, {
        namespace: 'lib:runner:moveFromWaitingToQueued',
        landRequestId: landRequestStatus.requestId,
        pullRequestId: landRequestStatus.request.pullRequestId,
      });
    }

    const priority = await this.client.bitbucket.getPullRequestPriority(request.forCommit);
    if (priority === 'HIGH') {
      await request.incrementPriority();
    }

    const user = await this.client.getUser(request.triggererAaid);
    await request.setStatus('queued', `Queued by ${user.displayName || user.aaid}`);

    const { speculationEngineEnabled } = await StateService.getAdminSettings();
    if (speculationEngineEnabled) {
      const impact = await this.client.bitbucket.getPRImpact(request.forCommit);
      request.updateImpact(impact);
    }

    return true;
  };

  removeLandRequestFromQueue = async (requestId: string, user: ISessionUser): Promise<boolean> => {
    const landRequestStatus = await this.queue.maybeGetStatusForQueuedRequestById(requestId);
    if (!landRequestStatus) return false;

    const displayName = user.displayName || user.aaid;
    await landRequestStatus.request.setStatus(
      'aborted',
      `Removed from queue by user ${displayName}`,
    );
    Logger.info('Removing landRequest from queue', {
      namespace: 'lib:removeLandRequestFromQueue',
      landRequestId: landRequestStatus.requestId,
      landRequestStatus,
      pullRequestId: landRequestStatus.request.pullRequestId,
    });
    return true;
  };

  updateLandRequestPriority = async (requestId: string, newPriority: number) => {
    const landRequest = await LandRequest.findById<LandRequest>(requestId);
    if (!landRequest) return false;
    await landRequest.updatePriority(newPriority);
    return true;
  };

  checkWaitingLandRequests = async () => {
    await withLock(
      // this lock ensures we don't run multiple checks at the same time that might cause a race condition
      'check-waiting-requests',
      async () => {
        await withLock(
          // this lock ensures we don't run the check when we're running this.next()
          'status-transition',
          async () => {
            const waitingRequestStatuses = await this.queue.getStatusesForWaitingRequests();

            Logger.info('Checking for waiting landrequests ready to queue', {
              namespace: 'lib:runner:checkWaitingLandRequests',
              waitingRequestStatuses,
            });

            for (const landRequestStatus of waitingRequestStatuses) {
              const landRequest = landRequestStatus.request;
              const pullRequestId = landRequest.pullRequestId;
              const triggererUserMode = await permissionService.getPermissionForUser(
                landRequest.triggererAaid,
              );
              const isAllowedToLand = await this.isAllowedToLand({
                pullRequestId,
                permissionLevel: triggererUserMode,
                queueFetcher: this.getQueue,
                sourceBranch: landRequest.pullRequest.sourceBranch,
                destinationBranch: landRequest.pullRequest.targetBranch,
                commit: landRequest.forCommit,
              });

              if (isAllowedToLand.abortErrors.length > 0) {
                Logger.warn('Aborting waiting land request', {
                  pullRequestId,
                  landRequestId: landRequest.id,
                  landRequestStatus,
                  abortReasons: isAllowedToLand.abortErrors,
                  namespace: 'lib:runner:checkWaitingLandRequests',
                });
                await landRequest.setStatus('aborted', isAllowedToLand.abortErrors.join(','));
                continue;
              }

              if (isAllowedToLand.errors.length === 0) {
                const movedState = await this.moveFromWaitingToQueued(landRequestStatus);
                if (movedState) return this.next();
              }
            }
          },
          undefined,
          // release the lock immediately so that this.next() can keep running, set to 100 because ttl needs to be > 0
          100,
        );
      },
      undefined,
      MAX_CHECK_WAITING_REQUESTS_TIME,
    );
  };

  // this check prevents the system from being hung if BB webhook doesn't work as expected
  checkRunningLandRequests = async () => {
    await withLock(
      // this lock ensures we don't run multiple checks at the same time that might cause a race condition
      'check-running-requests',
      async () => {
        await withLock(
          // this lock ensures we don't run the check when we're running this.next()
          'status-transition',
          async () => {
            const requests = await this.queue.getRunning();
            const runningRequests = requests.filter((request) => request.state === 'running');

            Logger.info('Checking running landrequests for timeout', {
              namespace: 'lib:runner:checkRunningLandRequests',
              runningRequests,
            });

            for (const landRequestStatus of runningRequests) {
              const timeElapsed = Date.now() - landRequestStatus.date.getTime();

              if (timeElapsed > LAND_BUILD_TIMEOUT_TIME) {
                const landRequest = landRequestStatus.request;

                Logger.warn('Failing running land request as timeout period is breached', {
                  pullRequestId: landRequest.pullRequestId,
                  landRequestId: landRequest.id,
                  namespace: 'lib:runner:checkRunningLandRequests',
                });
                await landRequest.setStatus('fail', 'Build timeout period breached');
              } else {
                const { buildId } = landRequestStatus.request;
                const { state } = await this.client.getLandBuild(buildId);

                // buildStatus can be SUCCESSFUL, FAILED or STOPPED
                await this.onStatusUpdate({
                  buildId,
                  buildStatus: 'result' in state ? state.result.name : state.name,
                });
              }
            }
          },
          undefined,
          // release the lock immediately so that this.next() can keep running, set to 100 because ttl needs to be > 0
          100,
        );
      },
      undefined,
    );
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

  getLandRequestStateByPRId = async (pullRequestId: number): Promise<LandRequestStatus | null> => {
    const landRequestStatus = await LandRequestStatus.findOne<LandRequestStatus>({
      where: {
        isLatest: true,
      },
      order: [['date', 'DESC']],
      include: [
        {
          model: LandRequest,
          include: [PullRequest],
          where: {
            pullRequestId,
          },
        },
      ],
    });
    return landRequestStatus;
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

  clearLandWhenAbleQueue = async () => {
    const awaitingRequests = await this.queue.getStatusesForWaitingRequests();
    for (const status of awaitingRequests) {
      await status.request.setStatus(
        'aborted',
        'Removed from land-when-able-queue manually by admin',
      );
    }
  };

  async isAllowedToLand({
    pullRequestId,
    permissionLevel,
    queueFetcher,
    sourceBranch,
    destinationBranch,
    commit,
  }: {
    pullRequestId: number;
    permissionLevel: IPermissionMode;
    queueFetcher: () => Promise<LandRequestStatus[]>;
    sourceBranch: string;
    destinationBranch: string;
    commit: string | null;
  }) {
    const isAllowedToMerge = await this.client.isAllowedToMerge({
      pullRequestId,
      permissionLevel,
      sourceBranch,
      destinationBranch,
    });

    const abortErrors: string[] = [];

    if (destinationBranch && destinationBranch !== isAllowedToMerge.pullRequest.targetBranch) {
      Logger.warn('Target branch changed after landing', {
        namespace: 'lib:runner:isAllowedToLand',
        pullRequestId: pullRequestId,
        landRequestTargetBranch: destinationBranch,
        prTargetBranch: isAllowedToMerge.pullRequest.targetBranch,
      });
      abortErrors.push('Target branch changed after landing');
    }

    if (commit && commit !== isAllowedToMerge.pullRequest.commit) {
      Logger.warn('PR commit changed after landing', {
        namespace: 'lib:runner:isAllowedToLand',
        pullRequestId: pullRequestId,
        landRequestCommit: commit,
        prCommit: isAllowedToMerge.pullRequest.commit,
      });
      abortErrors.push('PR commit changed after landing');
    }

    const queue = await queueFetcher();
    for (const queueItem of queue) {
      if (queueItem.request.pullRequestId === pullRequestId) {
        Logger.warn('Already has existing Land build', {
          namespace: 'lib:runner:isAllowedToLand',
          pullRequestId: pullRequestId,
          existingRequest: queueItem.request.id,
        });
        abortErrors.push('Already has existing Land build');
        break;
      }
    }
    return {
      abortErrors,
      ...isAllowedToMerge,
    };
  }

  getState = async (aaid: string): Promise<RunnerState> => {
    const requestingUserMode = await permissionService.getPermissionForUser(aaid);

    const [queue, users, waitingToQueue, state] = await Promise.all([
      requestingUserMode === 'read' ? [] : this.getQueue(),
      permissionService.getUsersPermissions(requestingUserMode),
      requestingUserMode === 'read' ? [] : this.queue.getStatusesForWaitingRequests(),
      StateService.getState(),
    ]);

    // We are ignoring errors because the IDE thinks all returned values can be null
    // However, this is operating as intended
    return {
      // @ts-ignore
      queue,
      // @ts-ignore
      users,
      // @ts-ignore
      waitingToQueue,
      bitbucketBaseUrl: `https://bitbucket.org/${this.config.repoConfig.repoOwner}/${this.config.repoConfig.repoName}`,
      permissionsMessage: this.config.permissionsMessage,
      ...state,
    };
  };

  static getDependentsAwaitingMerge(queue: LandRequestStatus[], currentStatus: LandRequestStatus) {
    return queue.filter(
      (status) =>
        status.state === 'awaiting-merge' &&
        status.request.dependsOn.split(',').includes(String(currentStatus.request.id)),
    );
  }
}
