import { LandRequest } from '../../types';

require('unfetch/polyfill');
const queryString = require('qs');

const endpoint = window.location.origin;

function createBtn(btnText: string, appearance: string, onClickFn: string) {
  return `<button type="button" class="ak-button ak-button__appearance-${
    appearance
  }" onClick="${onClickFn}()">
    ${btnText}
  </button>`;
}

interface LandSettings {
  allowLandWhenAble: boolean;
  usersAllowedToMerge: Array<string>;
}

const landButtonView = (settings: LandSettings) => {
  const landWhenAbleButton = settings.allowLandWhenAble
    ? createBtn('Land when able', 'default', 'landWhenAbleClicked')
    : '';
  return `<div>
    <p>This PR is not queued for Landing yet, click "Land" below or <a href="/index.html" target="_blank">here</a> for more information</p>
    <br>
    ${createBtn('Land!', 'primary', 'wantToMergeClicked')}
    <span style="width: 10px; display: inline-block"></span>
    ${landWhenAbleButton}
  </div>`;
};

const isQueuedView = () => {
  return `<div>
    <p>This PR is queued for release now. See <a href="/current-state/index.html" target="_blank">here</a> to see the current queue</p>
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

const pausedView = () => {
  return `<div>
    <p>Land builds are currently paused:</p>
    <p id="pausedReason"></p>
    <p>Please try again later.</p>
  </div>`;
};
const willLandWhenAbleView = () => {
  return `<div>
    <p>Excellent!</p>
    <p>Your pull request has been queued to land once it is able</p>
  </div>`;
};
// TODO: There are more detailed messages we could give here now
const notAllowedToLand = (reasons: {
  isOpen?: boolean;
  isApproved?: boolean;
  isGreen?: boolean;
  allTasksClosed?: boolean;
}) => {
  const isOpen = reasons.isOpen;
  const isApproved = reasons.isApproved;
  const isGreen = reasons.isGreen;
  const allTasksClosed = reasons.allTasksClosed;

  if (!isOpen) {
    return `<div><p>PR is already closed!</p></div>`;
  }
  if (!isApproved) {
    return `<div><p>Pull request needs to be approved</p></div>`;
  }
  if (!isGreen) {
    return `<div><p>Pull Request needs a green build</p></div>`;
  }
  if (!allTasksClosed) {
    return `<div><p>Pull Request needs all tasks completed (you might need to open and re-close them!)</p></div>`;
  }
  console.error(reasons);
  return `<div>
    <p>Error finding reason, please check console</p>
  </div>`;
};

const errorCreatingLandRequestView = (err: { reason?: string }) => {
  console.error(err);
  const reason = err.reason || "We honestly don't know... See error console";
  return `<div>
    <p>There was an error whilst queueing your land request:</p>
    <p style="color: red">${reason}</p>
  </div>`;
};

function getCurrentStateAndSettings() {
  return fetch(`${endpoint}/api/current-state`)
    .then(resp => resp.json())
    .then(state =>
      fetch(`${endpoint}/api/settings`)
        .then(resp => resp.json())
        .then(settings => ({
          settings,
          state,
        })),
    )
    .catch(err => console.error('error ', err));
}

// Fetches the user, repo and id vars
function getQueryStringVars() {
  const qs = window.location.search.substring(1);
  return queryString.parse(qs);
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
    })
    .catch(err => {
      setView(errorCreatingLandRequestView(err));
    });
}

function landWhenAbleClicked() {
  setView(checkingPullRequestView());
  landPullRequest({
    whenAbleFlag: true,
  });
}
// reusing this function for actual landrequests and for land when able requests
// THIS IS TERRIBLE - FIX ASAP
function landPullRequest(opts: { whenAbleFlag?: boolean } = {}) {
  const whenAbleFlag = opts.whenAbleFlag;
  const qs = getQueryStringVars();

  const qsString = queryString.stringify({
    username: qs.username,
    userUuid: qs.userUuid,
    commit: qs.commit,
    title: qs.title,
  });

  const endPointVerb = whenAbleFlag ? 'land-when-able' : 'land-pr';

  // TODO: send actual post data, not a query string...
  return fetch(
    `${endpoint}/api/${endPointVerb}/${qs.pullRequestId}?${qsString}`,
    {
      method: 'POST',
    },
  )
    .then(resp => resp.json())
    .then(() => {
      if (whenAbleFlag) {
        setView(willLandWhenAbleView());
        return;
      }
      setView(isQueuedView());
    })
    .catch(err => {
      setView(errorCreatingLandRequestView(err));
    });
}

function cancelButtonClicked() {
  setView(cancellingView());

  const qs = getQueryStringVars();
  const qsString = queryString.stringify({
    username: qs.username,
    userUuid: qs.userUuid,
  });

  return fetch(`${endpoint}/api/cancel-pr/${qs.pullRequestId}?${qsString}`, {
    method: 'POST',
  })
    .then(() => getCurrentStateAndSettings())
    .then(stateAndSettings => {
      if (!stateAndSettings) throw new Error('Failed to fetch settings');
      setView(landButtonView(stateAndSettings.settings));
    })
    .catch(err => {
      setView(errorCreatingLandRequestView(err));
    });
}

function displayQueueOrLandButton(
  queue: Array<LandRequest>,
  running: LandRequest,
  settings: LandSettings,
) {
  const queryStringVars = getQueryStringVars();
  const pullRequestId = queryStringVars.pullRequestId;
  const isQueuedOrRunning =
    queue.some(pr => pr.pullRequestId === pullRequestId) ||
    running.pullRequestId === pullRequestId;

  console.log('Current queue: ', queue);

  if (isQueuedOrRunning) {
    setView(isQueuedView());
  } else {
    setView(landButtonView(settings));
  }
}

const qs = getQueryStringVars();
if (qs.state === 'OPEN') {
  getCurrentStateAndSettings().then(resp => {
    if (!resp) return;

    const { settings, state } = resp;
    const allowedToMerge = settings.usersAllowedToMerge;
    const paused = state.paused;
    const pausedReason =
      state.pausedReason || 'Builds have been paused manually';
    if (paused) {
      setView(pausedView());
      // this is a bit messy, but we don't want to render "user" generated content as DOM, so we
      // have to separately render the text content for the reason
      document.querySelector('#pausedReason')!.textContent = pausedReason;
    } else if (allowedToMerge.indexOf(qs.username) > -1) {
      displayQueueOrLandButton(state.queue, state.running, settings);
    }
  });
} else {
  setView(
    notAllowedToLand({
      isOpen: false,
    }),
  );
}

// Wrapper function so that all the other HTML can all be wraped in this
function setView(innerHtml: string) {
  document.body.innerHTML = `<div class="releaseQueueView">
    ${innerHtml}
  </div>`;
}

// I've had to just add this hack as the functions declared here aren't available globally anymore
// I havent added the rest of the events since we're about to replace it, just FYI
window.wantToMergeClicked = wantToMergeClicked;
window.landWhenAbleClicked = landWhenAbleClicked;
window.cancelButtonClicked = cancelButtonClicked;
