/**
 * This file is just an example of the config you need to provide, none of the values present here are real
 */

module.exports = {
  name: 'My Landkid',
  key: 'my-landkid',
  baseUrl: 'https://mydomain.com',
  port: 8080,
  landkidAdmins: ['my-bb-admin-uuid'],
  repoConfig: {
    repoOwner: 'awesome-org',
    repoName: 'cool-thing',
    uuid: '{1b3e3a62-e6ec-4548-94ff-c4db699db0af}', // This is optional but will make development startup faster
  },
  deployment: {
    secret: 'this-is-your-session-secret-key',
    redis: {
      endpoint: '127.0.0.1',
      port: '6379',
    },
    oAuth: {
      key: 'ouath-client-key-from-bitbucket',
      secret: 'ouath-secret-from-bitbucket',
    },
  },
  maxConcurrentBuilds: 3,
  prSettings: {
    requiredApprovals: 1,
    canApproveOwnPullRequest: true,
    requireClosedTasks: true,
    requireGreenBuild: true,
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
    customChecks: [
      {
        rule: ({ pullRequest, buildStatuses, approvals, permissionLevel }) => true,
      },
    ],
    */
  },
};
