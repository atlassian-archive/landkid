// @flow
'use strict';

const writeJsonFile = require('write-json-file');
const readJsonFile = require('load-json-file');
const pathExists = require('path-exists');
const bodyParser = require('body-parser');
const { promisify } = require('util');
const lockFile = require('lockfile');
const express = require('express');
const morgan = require('morgan');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(bodyParser.json());
app.use(morgan('combined'));

const PORT = process.env.PORT || 8000;
const QUEUE_PATH = path.join(__dirname, 'queue.json');
const LOCK_PATH = path.join(__dirname, 'queue.lock');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const lock = promisify(lockFile.lock);
const unlock = promisify(lockFile.unlock);

async function lockQueue() {
  await lock(LOCK_PATH, {
    retries: 10,
    wait: 1000,
    pollPeriod: 100,
  });
}

async function unlockQueue() {
  await unlock(LOCK_PATH);
}

async function readQueue() {
  return await readJsonFile(QUEUE_PATH);
}

async function writeQueue(value) {
  await writeJsonFile(QUEUE_PATH, value);
}

function validateQueueValue(value) {
  console.log(value);
  if (
    typeof value !== 'object' ||
    typeof value.pr !== 'string' ||
    typeof value.username !== 'string'
    // TODO: comment ID for reply chain
  ) {
    throw new Error(`Expected: ${
      JSON.stringify({ "pr": "...", "username": "..." })
    }, not: ${
      JSON.stringify(value)
    }`);
  }
}

async function pushToQueue(value) {
  validateQueueValue(value);
  await lockQueue();
  let queue = await readQueue();
  let position = queue.length;
  queue.push(value);
  await writeQueue(queue);
  await unlockQueue();
  return position;
}

async function popFromQueue() {
  await lockQueue();
  let queue = await readQueue();
  let value = queue.pop();
  await writeQueue(queue);
  await unlockQueue();
  return value;
}

async function shiftFromQueue() {
  await lockQueue();
  let queue = await readQueue();
  let value = queue.shift();
  await writeQueue(queue);
  await unlockQueue();
  return value;
}

async function unshiftToQueue(value) {
  validateQueueValue(value);
  await lockQueue();
  let queue = await readQueue();
  let position = 0;
  queue.unshift(value);
  await writeQueue(queue);
  await unlockQueue();
  return position;
}

async function removeFromQueue(id) {
  await lockQueue();
  let queue = await readQueue();
  let match = queue.find(item => item.pr === id);
  queue = queue.filter(item => item.pr !== id);
  await writeQueue(queue);
  await unlockQueue();
  return !!match;
}

app.get('/', async (req, res) => {
  res.redirect(301, '/status');
});

app.get('/status', async (req, res, next) => {
  try {
    res.send(await readJsonFile(QUEUE_PATH));
  } catch (err) {
    next(err);
  }
});

app.post('/push', async (req, res, next) => {
  try {
    let position = await pushToQueue(req.body);
    res.send(200, { position });
  } catch (err) {
    next(err);
  }
});

app.get('/pop', async (req, res, next) => {
  try {
    let value = await popFromQueue();
    if (value) {
      res.send(200, value);
    } else {
      res.send(404);
    }
  } catch (err) {
    next(err);
  }
});

app.post('/shift', async (req, res, next) => {
  try {
    let value = await shiftFromQueue();
    if (value) {
      res.send(200, value);
    } else {
      res.send(404);
    }
  } catch (err) {
    next(err);
  }
});

app.post('/unshift', async (req, res, next) => {
  try {
    let position = await unshiftToQueue(req.body);
    res.send(200, { position });
  } catch (err) {
    next(err);
  }
});

app.post('/remove', async (req, res, next) => {
  try {
    await removeFromQueue(req.body.pull_request_id);
    res.send(200);
  } catch (err) {
    next(err);
  }
});

app.post('/webhook/new-pull-request', async (req, res) => {
  let pr = req.body.pull_request_id; // ???
  let username = req.body.username; // ???

  await comment(pr, `
    @${username} Hay, cool pull request you goat there. If you need help merging it, just ask me (comment "@atlaskid help").
  `);
});

app.post('/webhook/new-comment', async (req, res) => {
  let pr = req.body.pull_request_id; // ???
  let username = req.body.username; // ???

  try {
    let action = 'help';

    if (action === 'help') {
      await comment(pr, `
        @${username} Manure gonna love this.

        I'm here to help you merge and publish your changes. Once your pull request is ready, you can comment "@atlaskid land" and I will do the following:

          - Add your pull request to my queue
          - Work my way through all of the pull requests before yours
          - Create a new branch with your pull request on top of the latest master
          - Run our Continuous Integration server on the branch
          - If it succeeds, I'll merge it into master and publish everything
          - If it fails, I'll comment back here and let you know
          - Once you fix the issue, just start this whole process over again.

        This process ensures that master always stays green and keeps people from stepping on top of eachother.

        Goat, out.
      `);
    } else if (action === 'land' || action === 'merge' || action === 'deploy') {
      await pushToQueue({
        pr,
        username,
      });
      await comment(pr, `
        @${username} Okay... I've added this pull request to the queue to merge after it successfully builds
      `);
      // await drainQueue();
    } else if (action === 'cancel' || action === 'stop' || action === 'remove') {
      let matched = await removeFromQueue(pr);
      if (matched) {
        await comment(pr, `
          @${username} No worries, I removed this pull request from my queue. Let me know when you're ready to land it again.
        `);
      } else {
        await comment(pr, `
          @${username} I didn't have this pull request in my queue. Was I supposed to?
        `);
      }
    } else {
      await comment(pr, `
        @${username} You've confused me, I'm going to hit the hay. (Do you need "@atlaskid help"?)
      `);
    }
  } catch (err) {
    await comment(pr, `
      @${username} Oh no, I've failed you:\n\n${err.toString()}`
    );
  }
});

app.post('/webhook/build-status-update', async (req, res) => {
  if (failed) {
    comment(pr, `

    `);
  } else {
    comment(pr, `

    `);
  }
});

app.use((err, req, res, next) => {
  if (err) {
    res.status(500).send({ error: err.message });
  }
});

async function main() {
  if (!await pathExists(QUEUE_PATH)) {
    await writeJsonFile(QUEUE_PATH, []);
  }

  app.listen(PORT, () => {
    console.log(`Running on https://localhost:${PORT}/`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
