/**
 * This file is just an example of the config you need to provide, none of the values present here are real
 */

module.exports = {
  baseUrl: 'https://mydomain.com',
  port: 8080,
  landkidAdmins: ['my-bb-username'],
  repoConfig: {
    botUsername: 'my-bot',
    botPassword: 'my-bot-password',
    repoOwner: 'awesome-org',
    repoName: 'cool-thing',
    repoUuid: '{1b3e3a62-e6ec-4548-94ff-c4db699db0af}',
  },
  prSettings: {
    requiredApprovals: 1,
    canApproveOwnPullRequest: true,
    requireClosedTasks: true,
    requireGreenBuild: true,
    allowLandWhenAble: true,
  },
};
