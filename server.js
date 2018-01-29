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
    ciConfig: {}
  },
  localConfig
);

landkid(landkidConfig).catch(err => {
  console.log(err);
});
