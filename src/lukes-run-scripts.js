/********                    */
/********                    */
/********    DELETE ME       */
/********                    */
/********                    */
const axios = require('axios');
const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const ngrok = require('ngrok');

const BB_USERNAME = 'luke_batchelor';
const BB_PASSWORD = 'xxxxxxxxxxxxx'; // ;)
const REPO_OWNER = 'luke_batchelor';
const REPO_SLUG = 'mk-2-test-repo';
const WEBHOOK_NAME = 'Atlaskid - Webhook';
const axiosGetConfig = {
  auth: { username: BB_USERNAME, password: BB_PASSWORD }
};
const axiosPostConfig = {
  ...axiosGetConfig,
  headers: { 'Content-Type': 'application/json' }
};

/*
export type CommentEvent = {
  userId: string,
  pullRequestId: string,
  commentId: string,
  commentBody: string,
};
 */

// function processCommentWebhook(data) {
//   const userId = data && data.actor && data.actor.uuid;
//   const pullRequestId = data && data.pullrequest && data.pullrequest.id;
//   const commentId = data && data.comment && data.comment.id;
//   const commentBody =
//     data && data.comment && data.comment.content && data.comment.content.raw;
//
//   return {
//     userId,
//     pullRequestId,
//     commentId,
//     commentBody
//   };
// }

/*
  export type StatusEvent = {
    key: string,
    passed: boolean,
    description: string | null,
  };
*/
function processStatusWebhook(data) {
  const buildStatus = data && data.commit_status && data.commit_status.state;
  if (buildStatus === 'INPROGRESS') return null;
  // We cant get any *real* id/key here, so we'll use the url as the key, as its consistent between what we get back when creating a build and when getting a status-update
  const buildId = data && data.commit_status && data.commit_status.url;
  const passed = buildStatus === 'SUCCESSFUL';
  return {
    key: buildId,
    passed,
    // wasnt sure what you want for description
    description: ''
  };
}

// THis is just my debug loop

(async () => {
  // console.log('here');
  // await startLocalServer(9000, handleWebhook);
  // const ngrokUrl = await setupNgrok(9000);
  // await cleanUpOldWebhooks();
  // await createWebhook(ngrokUrl);
  // const id = await postComment('2', 'Noice Gary')
  // console.log(id)
  // await postComment('2', 'Noiice Garrryyyyy', id);
  // const prData = await getPullRequestInfo('2')
  // const data = await startCustomPipeline('2', 'custom-build-2');
  // console.log(data)
  // const id = await getPullRequestToCommit('2')
  // console.log(id)
  await isLandBuildRunning();
})();

async function startCustomPipeline(pullRequestId, customBuildName) {
  const endpoint = `https://api.bitbucket.org/2.0/repositories/${REPO_OWNER}/${
    REPO_SLUG
  }/pipelines/`;
  const commitHash = await getPullRequestToCommit(pullRequestId);
  const postData = {
    target: {
      commit: {
        hash: commitHash,
        type: 'commit'
      },
      selector: {
        type: 'custom',
        pattern: customBuildName
      },
      type: 'pipeline_commit_target'
    }
  };
  const response = await axios.post(
    endpoint,
    JSON.stringify(postData),
    axiosPostConfig
  );
  return response.data;
}
//
// async function getPullRequestToCommit(pullRequestId) {
//   const endpoint = `https://api.bitbucket.org/2.0/repositories/${REPO_OWNER}/${
//     REPO_SLUG
//   }/pullrequests/${pullRequestId}`;
//   const response = await axios.get(endpoint, axiosGetConfig);
//   const commit =
//     response.data &&
//     response.data.source &&
//     response.data.source.commit &&
//     response.data.source.commit.hash;
//   return commit;
// }

// async function postComment(pullRequestId, commentStr, replyToCommentId) {
//   const endpoint = `https://api.bitbucket.org/1.0/repositories/${REPO_OWNER}/${REPO_SLUG}/pullrequests/${pullRequestId}/comments/`;
//   const postData = { content: commentStr};
//   if (replyToCommentId) {
//     postData.parent_id = `${replyToCommentId}`;
//   }
//   const config = {
//     ...axiosGetConfig,
//     headers: {
//       'Content-Type': 'application/json',
//     }
//   };
//   const response = await axios.post(endpoint, JSON.stringify(postData), config);
//   return response.data.comment_id;
// }

/** NOT WOERKING YET */

async function isLandBuildRunning() {
  const endpoint = `https://api.bitbucket.org/2.0/repositories/${REPO_OWNER}/${
    REPO_SLUG
  }/pipelines/`;
  const requestConfig = {
    ...axiosGetConfig,
    params: {
      pagelen: 50,
      // get the most recent builds first
      sort: '-created_on',
      'state.name': 'IN_PROGRESS'
    }
  };
  const response = await axios.get(endpoint, requestConfig);
  console.log(response.data.values.map(p => p.state));
}

/************************* ignore below  here*************************** */
/************************* ignore below  here*************************** */
/************************* ignore below  here*************************** */

/* Sets up a local webserver that listens for post requests and calls our webhook handler
//    bbCredentials are required for the webhookHandler */
// async function startLocalServer(port, webhookHandler) {
//   const app = express();
//   app.use(bodyParser.json());
//   app.use(morgan('combined'));
//
//   app.get('/', (req, res) => {
//     res.send('OK');
//   });
//   app.post('/', (req, res) => {
//     webhookHandler(req.body);
//     res.sendStatus(200);
//   });
//
//   console.log('Starting local webhook handling server...');
//   return new Promise(resolve => {
//     app.listen(port, () => {
//       console.log(`  Webhook server started and listening on port ${port}.\n`);
//       resolve();
//     });
//   });
// }

/*
  ngrok sets up a http tunnel to our local server that can be accessed from the internet
*/
// async function setupNgrok(port) {
//   console.log('Setting up ngrok tunnel...');
//   return new Promise((resolve, reject) => {
//     ngrok.connect({ proto: 'http', addr: port }, (ngrokError, ngrokUrl) => {
//       if (ngrokError) {
//         console.log('❌ Error: ngrok setup failed\n', ngrokError);
//         reject(ngrokError);
//       } else {
//         console.log(`  ngrok listening at ${ngrokUrl}\n`);
//         resolve(ngrokUrl);
//       }
//     });
//   });
// }

// Receives webhook data and alerts user when required
// function handleWebhook(webhookData) {
//   console.log('Receieved webhook data');
//   console.log(JSON.stringify(webhookData, null, 2));
// }

/* Creates a Bitbucket webhook to listen for commit-status changes.
   Returns a promise that resolves with information about the created webhook */
// function createWebhook(ngrokUrl) {
//   console.log('Creating Bitbucket webhoook...');
//   const endpoint = `https://api.bitbucket.org/2.0/repositories/${REPO_OWNER}/${
//     REPO_SLUG
//   }/hooks`;
//   const webhookData = {
//     description: WEBHOOK_NAME,
//     url: ngrokUrl,
//     active: true,
//     events: [
//       'repo:commit_status_created',
//       'repo:commit_status_updated',
//       'pullrequest:comment_created'
//     ]
//   };
//   return new Promise(resolve =>
//     axios.post(endpoint, webhookData, axiosGetConfig).then(res => {
//       console.log(`  Webhook created successfully ${res.data.uuid}\n`);
//       resolve(res.data);
//     })
//   );
// }

// TODO: Maybe also clean up all inactive webhooks that match this addons description?
// TODO: What to do if another process leaves open a lot of old webhooks? We might not fetch them
//       all. Could paginate?
/* Looks for any previously created webhooks for the same user and deletes them.
   Webhoks will become inactive automatically, but this keeps the webhooks UI clean for the next
   person
*/
// async function cleanUpOldWebhooks() {
//   console.log('Checking for stale webhooks...');
//   const endpoint = `https://api.bitbucket.org/2.0/repositories/${REPO_OWNER}/${
//     REPO_SLUG
//   }/hooks`;
//
//   return axios
//     .get(endpoint, { ...axiosGetConfig, params: { pagelen: 30 } })
//     .then(response => {
//       const currentUserWebhooks = response.data.values
//         .filter(webhook => webhook.description === WEBHOOK_NAME)
//         .map(webhook => webhook.links.self.href);
//       console.log(`  Found ${currentUserWebhooks.length} webhook(s)`);
//       return Promise.all(
//         currentUserWebhooks.map(webhook => deleteWebhook(webhook))
//       ).then(results => {
//         const succeeded = results.filter(result => !!result).length;
//         const failed = results.filter(result => !result).length;
//         console.log(`  Successfully removed ${succeeded} webhook(s)\n`);
//         if (failed) {
//           console.log(`  Failed to remove ${failed} webhook(s)\n`);
//         }
//       });
//     });
// }
//
// // Helper method to delete a specified webhook.
// // Returns a promise that resolves with true for success and false otherwise
// function deleteWebhook(webhookEndpoint) {
//   // We catch the failures here so that Promise.all resolves ALL the requests
//   return axios
//     .delete(webhookEndpoint, axiosGetConfig)
//     .then(() => Promise.resolve(true))
//     .catch(() => Promise.resolve(false));
// }
