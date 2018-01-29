const endpoint = window.location.origin;

const landButtonView = pullRequestId => {
  return `<div>
    <p>This PR is not queued for Landing yet, click "Land" below or <a href="google.com">here</a> for more information</p>
    <br>
    <button type="button" class="ak-button ak-button__appearance-primary" onClick="landButtonClicked(${
      pullRequestId
    })">
      Land this PR
      </button>
  </div>`;
};

const queueView = positionInQueue => {
  return `<div>
    <p>This PR is queued for release now. See <a href="goog.e.com">here</a> for more information about what this means</p>
    <p>Position in queue: <span class="numberInQueue">${positionInQueue +
      1}</span><p>
    <p>
      <button type="button" class="ak-button ak-button__appearance-default" onClick="cancelButtonClicked()">
        Cancel release
      </button>
    </p>
  </div>`;
};

const cancellingView = () => {
  return `<div>
    <p>Cancelling...</p>
  </div>`;
};

const cancelledView = () => {
  return `<div>
    <p>Release has been cancelled.</p>
    <p>Please refresh page to re-submit</p>
  </div>`;
};

const landingView = () => {
  return `<div>
    <p>Sending land request...</p>
  </div>`;
};

const errorCreatingLandRequestView = err => {
  console.error(err);
  const reason = err.reason || "We honestly don't know... See error console";
  return `<div>
    <p>There was an error whilst queueing your land request:</p>
    <p style="color: red">${reason}</p>
  </div>`;
};

function getCurrentQueue() {
  return fetch(`${endpoint}/api/current-queue`)
    .then(resp => resp.json())
    .catch(err => console.error('error ', err));
}

// Fetches the user, repo and id vars
function getQueryStringVars() {
  const queryString = window.location.search.substring(1);
  return window.Qs.parse(queryString);
}

function landButtonClicked() {
  setView(landingView());

  const queryStringVars = getQueryStringVars();
  const pullRequestId = queryStringVars.pullRequestId;
  const username = queryStringVars.username;
  const userUuid = queryStringVars.userUuid;
  const commit = queryStringVars.commit;
  const title = queryStringVars.title;

  const queryString = window.Qs.stringify({
    username,
    userUuid,
    commit,
    title
  });

  return fetch(`${endpoint}/api/land-pr/${pullRequestId}?${queryString}`, {
    method: 'POST'
  })
    .then(resp => resp.json())
    .then(landResp => {
      const positionInQueue = landResp.positionInQueue;
      setView(queueView(positionInQueue));
    })
    .catch(err => {
      setView(errorCreatingLandRequestView(err));
    });
}

function cancelButtonClicked() {
  setView(cancellingView());

  const queryStringVars = getQueryStringVars();
  const pullRequestId = queryStringVars.pullRequestId;
  const userUuid = queryStringVars.userUuid;
  const username = queryStringVars.username;

  return fetch(
    `${endpoint}/api/cancel-pr/${pullRequestId}?userUuid=${userUuid}&username=${
      username
    }`,
    { method: 'POST' }
  )
    .then(resp => resp.json())
    .then(landResp => {
      setView(landButtonView());
    })
    .catch(err => {
      setView(errorCreatingLandRequestView(err));
    });

  window.setTimeout(() => {
    setView(landButtonView(pullRequestId));
  }, 1500);
}

function displayQueueOrLandButton(currentQueue) {
  const queryStringVars = getQueryStringVars();
  const repoSlug = queryStringVars.repoSlug;
  const repoOwner = queryStringVars.repoOwner;
  const pullRequestId = queryStringVars.pullRequestId;
  const userUuid = queryStringVars.userUuid;
  const currentUser = queryStringVars.username;

  const positionInQueue = currentQueue.findIndex(
    pr => pr.pullRequestId === pullRequestId
  );

  console.log('Current queue: ', currentQueue);

  if (positionInQueue > -1) {
    setView(queueView(positionInQueue));
  } else {
    setView(landButtonView(pullRequestId, userUuid));
  }
}

getCurrentQueue().then(queueResp => {
  displayQueueOrLandButton(queueResp.currentQueue);
});

// Wrapper function so that all the other HTML can all be wraped in this
function setView(innerHtml) {
  document.body.innerHTML = `<div class="releaseQueueView">
    ${innerHtml}
  </div>`;
}
