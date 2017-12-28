'use strict';

const landkid = require('./');
const path = require('path');
const localConfig = require('./config');

const landkidConfig = Object.assign(
  {
    port: 8000,
    host: 'bitbucket',
    hostConfig: {},
    ci: 'bitbucket-pipelines',
    ciConfig: {},
    queuePath: path.join(__dirname, 'landkid-queue.json'),
    lockPath: path.join(__dirname, 'landkid-queue.lock')
  },
  localConfig
);

landkid(landkidConfig).catch(err => {
  console.log(err);
});
