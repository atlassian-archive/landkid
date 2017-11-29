'use strict';

const landkid = require('./');
const path = require('path');

landkid({
  port: 8000,
  host: 'bitbucket',
  hostConfig: {},
  ci: 'bitbucket-pipelines',
  ciConfig: {},
  queuePath: path.join(__dirname, 'landkid-queue.json'),
  lockPath: path.join(__dirname, 'landkid-queue.lock')
}).catch(err => {
  console.log(err);
});
