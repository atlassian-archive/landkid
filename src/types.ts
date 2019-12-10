export type LandRequestOptions = {
  prId: number;
  prAuthorAaid: string;
  prTitle: string;
  prTargetBranch: string;
  triggererAaid: string;
  commit: string;
};

export type RepoConfig = {
  repoOwner: string;
  repoName: string;
  uuid?: string;
};

type CustomCheck = {
  rule: (
    pullRequestInfo: {
      pullRequest: BB.PullRequest;
      buildStatuses: BB.BuildStatus[];
      approvals: string[];
      permissionLevel: IPermissionMode;
    },
  ) => Promise<true | string>;
};

export type PullRequestSettings = {
  requiredApprovals: number;
  requireClosedTasks: boolean;
  requireGreenBuild: boolean;
  canApproveOwnPullRequest: boolean;
  allowLandWhenAble: boolean;
  customChecks?: CustomCheck[];
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

export type Config = {
  name?: string;
  key?: string;
  port: number;
  baseUrl: string;
  landkidAdmins: string[];
  repoConfig: RepoConfig;
  prSettings: PullRequestSettings;
  deployment: DeploymentConfig;
  sequelize?: any;
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
};
