// This file should never be checked in and is only used for local testing

const baseUrl = 'https://lbatch.ngrok.io/';
const botUsername = process.env.BITBUCKET_USERNAME || 'luke_batchelor';
const botPassword = process.env.BITBUCKET_PASSWORD || 'K6CsWGa9AsJkqZ2jvWwJ';
const repoOwner = 'atlassian';
const repoName = 'atlaskit-mk-2';
const usersAllowedToApprove = ['luke_batchelor', 'thejameskyle'];

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
    usersAllowedToApprove: usersAllowedToApprove,
  },
  ciConfig: {
    botUsername: botUsername,
    botPassword: botPassword,
    repoOwner: repoOwner,
    repoName: repoName,
  },
};

/*
          {
            "condition": "equals",
            "target": "repository.uuid",
            "params": {
              "value": "{6380b4e9-6ac5-4dd4-a8e0-65f09cabe4c8}"
            }
          }

*/
