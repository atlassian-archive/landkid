#!/usr/bin/env node

'use strict';

let fs = require('fs');
let path = require('path');
let landkid = require('./');

if (!fs.existsSync(path.join(process.cwd(), 'config.js'))) {
  console.error('No config.js file found.');
  console.error('See the readme for information about this');
  process.exit(1);
}

let localConfig = require(path.join(process.cwd(), 'config.js'));

// TODO: Checks on actual config passed in (could also check these defaults match the correct shape)
let landkidConfig = Object.assign(
  {
    port: 8000,
    host: 'bitbucket',
    hostConfig: {},
    ci: 'bitbucket-pipelines',
    ciConfig: {},
    prSettings: {
      requiredApprovals: 1,
      canApproveOwnPullRequest: false,
      requireClosedTasks: true,
      requireGreenBuild: true,
      allowLandWhenAble: false,
      usersAllowedToApprove: [],
    },
  },
  localConfig,
);

(async () => {
  const server = await landkid(landkidConfig);

  server.listen(landkidConfig.port, () => {
    const localUrl = `http://localhost:${landkidConfig.port}`;
    const baseUrl = landkidConfig.baseUrl;
    const stateUrl = `${baseUrl}/current-state`;
    const installationUrl = `${baseUrl}/bitbucket/atlassian-connect.json`;

    console.log(`Local server started at ${localUrl}`);
    console.log(`BaseUrl set to ${baseUrl}`);
    console.log(`Addon can be installed from ${installationUrl}`);
    console.log(`Current state can be found: ${stateUrl}`);
  });
})();
