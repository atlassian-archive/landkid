import { AxiosInstance } from 'axios';
import { Logger } from 'winston';

export type LandRequestOptions = {
  prId: number;
  prAuthorAaid: string;
  prTitle: string;
  prSourceBranch: string;
  prTargetBranch: string;
  triggererAaid: string;
  commit: string;
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
};

export type OAuthConfig = {
  key: string;
  secret: string;
};

export type EventData = {
  landRequestId?: string;
  pullRequestId?: string;
  targetBranch?: string;
  commit?: string;
  duration?: number;
};

type EventListener = {
  event: string;
  listener: (data: EventData) => void;
};

export type Config = {
  name?: string;
  key?: string;
  port: number;
  baseUrl: string;
  landkidAdmins: string[];
  repoConfig: RepoConfig;
  prSettings: PullRequestSettings;
  deployment: DeploymentConfig;
  maxConcurrentBuilds?: number;
  permissionsMessage: string;
  sequelize?: any;
  eventListeners?: EventListener[];
  easterEgg?: any;
};

export type RunnerState = {
  queue: IStatusUpdate[];
  waitingToQueue: IStatusUpdate[];
  pauseState: IPauseState | null;
  daysSinceLastFailure: number;
  users: UserState[];
  bannerMessageState: IMessageState | null;
  bitbucketBaseUrl: string;
  permissionsMessage: string;
};
