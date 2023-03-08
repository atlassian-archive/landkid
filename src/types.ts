import { AxiosInstance } from 'axios';
import { Logger } from 'winston';

export type LandRequestOptions = {
  prId: number;
  prAuthorAaid: string;
  prAuthorAccountId: string;
  prTitle: string;
  prSourceBranch: string;
  prTargetBranch: string;
  triggererAaid: string;
  triggererAccountId: string;
  commit: string;
  mergeStrategy?: IMergeStrategy;
};

export type RepoConfig = {
  repoOwner: string;
  repoName: string;
  uuid?: string;
};

type CustomRule = {
  rule: (
    pullRequestInfo: {
      pullRequest: BB.PullRequest;
      buildStatuses: BB.BuildStatus[];
      approvals: string[];
      permissionLevel: IPermissionMode;
    },
    utils: {
      axios: AxiosInstance;
      Logger: Logger;
    },
  ) => Promise<true | string>;
  errorKeys?: {
    [key: string]: string;
  };
};

export type WidgetSettings = {
  refreshInterval: number;
  refreshOnlyWhenInViewport: boolean;
  enableSquashMerge: boolean;
};

export type PullRequestSettings = {
  requiredApprovals: number;
  requireClosedTasks: boolean;
  requireGreenBuild: boolean;
  canApproveOwnPullRequest: boolean;
  allowLandWhenAble: boolean;
  customChecks?: CustomRule[];
  customWarnings?: CustomRule[];
};

export type ApprovalChecks = {
  isOpen: boolean;
  isApproved: boolean;
  isGreen: boolean;
  allTasksClosed: boolean;
};

export type DeploymentConfig = {
  secret: string;
  redis: {
    endpoint: string;
    port: number;
  };
  oAuth: OAuthConfig;
  enableBasicAuth?: boolean;
};

export type OAuthConfig = {
  key: string;
  secret: string;
};

export type EventData = {
  landRequestId?: string;
  pullRequestId?: string;
  sourceBranch?: string;
  targetBranch?: string;
  commit?: string;
  duration?: number;
};

type EventListener = {
  event: string;
  listener: (data: EventData, { Logger }: { Logger: Logger }) => void;
};

export type Config = {
  name?: string;
  key?: string;
  port: number;
  baseUrl: string;
  landkidAdmins: string[];
  repoConfig: RepoConfig;
  widgetSettings: WidgetSettings;
  prSettings: PullRequestSettings;
  deployment: DeploymentConfig;
  maxConcurrentBuilds?: number;
  permissionsMessage: string;
  sequelize?: any;
  eventListeners?: EventListener[];
  easterEgg?: any;
  mergeSettings?: MergeSettings;
  speculationEngineEnabled: boolean;
};

export type MergeSettings = {
  /** Skip the destination branch build when there are successful dependent requests awaiting merge.
   * This prevents multiple branch builds triggering multiple merges that happen in quick succession.
   * Achieved by adding [skip ci] to the merge commit message
   */
  skipBuildOnDependentsAwaitingMerge?: boolean;
  /** Wait for particular builds on the target branch to finish before merging */
  mergeBlocking?: {
    enabled: boolean;
    builds: [
      {
        targetBranch: string;
        pipelineFilterFn: (pipelines: BB.Pipeline[]) => BB.Pipeline[];
      },
    ];
  };
};

export type State = {
  pauseState: IPauseState | null;
  bannerMessageState: IMessageState | null;
  maxConcurrentBuilds: number;
  daysSinceLastFailure: number;
  priorityBranchList: IPriorityBranch[];
  adminSettings: IAdminSettings;
  config: { mergeSettings?: MergeSettings; speculationEngineEnabled: boolean };
};

export type RunnerState = State & {
  queue: IStatusUpdate[];
  waitingToQueue: IStatusUpdate[];
  users: UserState[];
  priorityBranchList: IPriorityBranch[];
  bitbucketBaseUrl: string;
  permissionsMessage: string;
};

export type MergeOptions = {
  skipCI?: boolean;
  mergeStrategy?: IMergeStrategy;
  numRetries?: number;
};
