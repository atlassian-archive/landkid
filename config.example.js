/**
 * This file is just an example of the config you need to provide, none of the values present here are real
 */

module.exports = {
  name: 'MyName Landkid',
  key: 'myname-landkid',
  baseUrl: 'https://myname-landkid.ngrok.io',
  port: 8080,
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
  },
  maxConcurrentBuilds: 3,
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
  eventListeners: [
    // {
    //   event: 'EXAMPLE_EVENT_1',
    //   listeners: [() => {}]
    // },
    // {
    //   event: 'EXAMPLE_EVENT_2',
    //   listener: () => {}
    // }
  ],
};
