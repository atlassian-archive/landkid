/**
 * This file is just an example of the config you need to provide, none of the values present here are real
 */

module.exports = {
  name: 'MyName Landkid',
  key: 'myname-landkid',
  baseUrl: 'https://myname-landkid.ngrok.io',
  port: process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 8080,
  landkidAdmins: ['your bb uuid'],
  repoConfig: {
    repoOwner: 'bitbucket workspace (e.g. bb username)',
    repoName: 'myname-landkid-test-repo',
    uuid: 'repo uuid', // This is optional but will make development startup faster
  },
  deployment: {
    secret: 'session secret', // for local dev this can be anything
    redis: {
      endpoint: process.env.REDIS_SESSION_HOST,
      port: process.env.REDIS_SESSION_PORT,
    },
    // Create oauth consumer for workspace
    // Needs to be private with callback URL as baseUrl/auth/callback and URL set to baseUrl
    // Requires account read permissions
    oAuth: {
      key: process.env.oauth_key,
      secret: process.env.oauth_secret,
    },
    enableBasicAuth: false,
  },
  maxConcurrentBuilds: 3,
  widgetSettings: {
    refreshInterval: 10000,
    refreshOnlyWhenInViewport: false,
    enableSquashMerge: false,
  },
  prSettings: {
    requiredApprovals: 0,
    canApproveOwnPullRequest: true,
    requireClosedTasks: true,
    requireGreenBuild: false,
    allowLandWhenAble: true,
    /** What is provided to a custom rule:
     *  {
     *    pullRequest: BB.PullRequest -- see /src/bitbucket/types.d.ts
     *    buildStatuses: BB.BuildStatus[] -- see /src/bitbucket/types.d.ts
     *    approvals: string[] -- usernames of all real approvals
     *    permissionLevel: "read" | "land" | "admin" -- permission level of the user requesting /can-land
     *  }
     * Return true if the rule is passed and is not blocking landing,
     * otherwise return the error message to be displayed on the PR
     */
  },
  mergeSettings: {
    skipBuildOnDependentsAwaitingMerge: true,
    mergeBlocking: {
      enabled: false,
      builds: [
        {
          targetBranch: 'master',
          pipelineFilterFn: (pipelines) => {
            return (
              pipelines
                .filter(
                  (pipeline) =>
                    pipeline.state.name === 'IN_PROGRESS' || pipeline.state.name === 'PENDING',
                )
                // Filter to only default builds run on 'push'.
                // Allow manual trigger of default builds but exclude custom builds that are triggered manually
                .filter(
                  (job) => job.trigger.name !== 'SCHEDULE' && job.target.selector.type !== 'custom',
                )
            );
          },
        },
      ],
    },
  },
  /**
   * Speculation engine re-orders top n PRs where n is the available free slots based on the impact of the PRs. The lower impact PRs are given preference.
   * Impact meta data is processed and send to landkid by the consuming repo using build statuses.
   */
  speculationEngineEnabled: false,
  eventListeners: [
    {
      event: 'PULL_REQUEST.MERGE.SUCCESS',
      listener: ({
        landRequestId,
        pullRequestId,
        sourceBranch,
        targetBranch,
        commit,
        duration,
      }) => {
        // send data to metrics tooling
      },
    },
  ],
};
