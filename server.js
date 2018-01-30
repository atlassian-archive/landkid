#!/usr/bin/env node
'use strict';

let fs = require('fs');
let path = require('path');
let landkid = require('./');

if (!fs.existsSync('./config.js')) {
  console.error('No config.js file found.');
  console.error('See the readme for information about this');
}

let localConfig = require('./config');

let landkidConfig = Object.assign(
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
