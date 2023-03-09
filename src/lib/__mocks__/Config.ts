import { Config } from '../../types';

export const hasConfig = true;

export const config: Config = {
  port: 8080,
  baseUrl: '',
  landkidAdmins: [],
  repoConfig: {
    repoOwner: 'test',
    repoName: 'test-repo',
  },
  widgetSettings: {
    refreshInterval: 60,
    refreshOnlyWhenInViewport: true,
    enableSquashMerge: false,
  },
  prSettings: {
    requiredApprovals: 1,
    canApproveOwnPullRequest: false,
    requireClosedTasks: true,
    requireGreenBuild: true,
    allowLandWhenAble: true,
  },
  deployment: {
    secret: 'foo',
    redis: {
      endpoint: '',
      port: 8081,
    },
    oAuth: {
      key: 'foo',
      secret: 'bar',
    },
  },
  maxConcurrentBuilds: 2,
  permissionsMessage: '',
  mergeSettings: {},
  speculationEngineEnabled: false,
};
