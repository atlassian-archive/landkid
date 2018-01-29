const endpoint = window.location.origin;

const landButtonView = () => {
  return `<div>
    <p>This PR is not queued for Landing yet, click "Land" below or <a href="google.com">here</a> for more information</p>
    <br>
    <button type="button" class="ak-button ak-button__appearance-primary" onClick="wantToMergeClicked()">
      I want to merge
      </button>
  </div>`;
};

const isQueuedView = () => {
  return `<div>
    <p>This PR is queued for release now. See <a href="google.com">here</a> for more information about what this means</p>
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

const checkingPullRequestView = () => {
  return `<div>
    <p>Checking pull request...</p>
  </div>`;
};

const notAllowedToLand = reasons => {
  const isOpen = reasons.isOpen;
  const isApproved = reasons.isApproved;
  const isGreen = reasons.isGreen;

  if (!isOpen) {
    return `<div><p>PR is already closed!</p></div>`;
  }
  if (!isApproved) {
    return `<div><p>Pull request needs to be approved</p></div>`;
  }
  if (!isGreen) {
    return `<div><p>Pull Request needs a green build</p></div>`;
  }
  console.log(reasons);
  return `<div>
    <p>Error finding reason, please check console</p>
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

function getCurrentState() {
  return fetch(`${endpoint}/api/current-state`)
    .then(resp => resp.json())
    .catch(err => console.error('error ', err));
}

// Fetches the user, repo and id vars
function getQueryStringVars() {
  const queryString = window.location.search.substring(1);
  return window.Qs.parse(queryString);
}

function wantToMergeClicked() {
  setView(checkingPullRequestView());

  const qs = getQueryStringVars();
  fetch(`${endpoint}/api/is-allowed-to-land/${qs.pullRequestId}`)
    .then(resp => resp.json())
    .then(data => {
      if (data.isAllowedToLand.isAllowed) {
        return landPullRequest();
      } else {
        setView(notAllowedToLand(data.isAllowedToLand));
      }
    });
}

function landPullRequest() {
  const qs = getQueryStringVars();

  const queryString = window.Qs.stringify({
    username: qs.username,
    userUuid: qs.userUuid,
    commit: qs.commit,
    title: qs.title
  });

  return fetch(`${endpoint}/api/land-pr/${qs.pullRequestId}?${queryString}`, {
    method: 'POST'
  })
    .then(resp => resp.json())
    .then(() => setView(isQueuedView()))
    .catch(err => {
      setView(errorCreatingLandRequestView(err));
    });
}

function cancelButtonClicked() {
  setView(cancellingView());

  const qs = getQueryStringVars();
  const queryString = window.Qs.stringify({
    username: qs.username,
    userUuid: qs.userUuid
  });

  return fetch(`${endpoint}/api/cancel-pr/${qs.pullRequestId}?${queryString}`, {
    method: 'POST'
  })
    .then(resp => resp.json())
    .then(() => setView(landButtonView()))
    .catch(err => {
      setView(errorCreatingLandRequestView(err));
    });
}

function displayQueueOrLandButton(currentQueue) {
  const queryStringVars = getQueryStringVars();
  const pullRequestId = queryStringVars.pullRequestId;
  const isQueued = currentQueue.some(pr => pr.pullRequestId === pullRequestId);

  console.log('Current queue: ', currentQueue);

  if (isQueued) {
    setView(isQueuedView());
  } else {
    setView(landButtonView());
  }
}

const queryStringVars = getQueryStringVars();

if (queryStringVars.state === 'OPEN') {
  getCurrentState().then(stateResp => {
    displayQueueOrLandButton(stateResp.currentQueue);
  });
} else {
  setView(notAllowedToLand({ isOpen: false }));
}

// Wrapper function so that all the other HTML can all be wraped in this
function setView(innerHtml) {
  document.body.innerHTML = `<div class="releaseQueueView">
    ${innerHtml}
  </div>`;
}
