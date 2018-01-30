'use strict';

const fs = require('fs');
const path = require('path');
const landkid = require('./');

if (!fs.existsSync('./config.js')) {
  console.error('No config.js file found.');
  console.error('See the readme for information about this');
}

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
