#!/usr/bin/env node

'use strict';

let fs = require('fs');
let path = require('path');

let webpackConfig = require('./webpack.config');
let landkid = require('./');

if (!fs.existsSync(path.join(process.cwd(), 'config.js'))) {
  console.error('No config.js file found.');
  console.error('See the readme for information about this');
  process.exit(1);
}

let localConfig = require(path.join(process.cwd(), 'config.js'));

let landkidConfig = Object.assign(
  {
    port: 8000,
    host: 'bitbucket',
    hostConfig: {},
    ci: 'bitbucket-pipelines',
    ciConfig: {},
    settings: {
      requireApproval: true,
      requireClosedTasks: true,
      requireGreenBuild: true
    }
  },
  localConfig
);

let server = landkid(landkidConfig, webpackConfig);

server.listen(landkidConfig.port, () => {
  console.log(
    `Landkid server started at http://localhost:${landkidConfig.port}`
  );
  console.log(`BaseUrl set to ${landkidConfig.baseUrl}`);
  console.log(
    `Addon can be installed from ${
      landkidConfig.baseUrl
    }/bitbucket/atlassian-connect.json`
  );
  console.log(
    `Webhooks should be configured to point to ${
      landkidConfig.baseUrl
    }/webhook/status-updated`
  );
});
