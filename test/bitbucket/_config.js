// this is a fake config for the bitbucket tests
const baseUrl = 'https://fake.base.url.com';
const botUsername = 'bot_username';
const botPassword = 'bot_password';
const repoOwner = 'repo_owner';
const repoName = 'repo_name';
const usersAllowedToApprove = ['user_1', 'user_2'];

module.exports = {
  host: 'bitbucket',
  ci: 'bitbucket-pipelines',
  baseUrl: baseUrl,
  port: 8080,
  hostConfig: {
    botUsername: botUsername,
    botPassword: botPassword,
    repoOwner: repoOwner,
    repoName: repoName,
    usersAllowedToApprove: usersAllowedToApprove
  },
  ciConfig: {
    botUsername: botUsername,
    botPassword: botPassword,
    repoOwner: repoOwner,
    repoName: repoName
  }
};
