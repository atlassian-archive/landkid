const queryString = require('qs');

const endpoint = window.location.origin;

interface BBRequest<T> {
  (
    opts: {
      url: string;
      type?: string;
      success: (resp: T) => void;
      error: (err: any) => void;
    },
  ): void;
}

const AP = (window as any).AP as {
  require: (name: 'proxyRequest', fn: <T>(req: BBRequest<T>) => void) => void;
};

function proxy<T>(url: string, type: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const { repoId, pullRequestId } = getQueryStringVars();

    AP.require('proxyRequest', req => {
      req({
        url: `${url}/${repoId}/${pullRequestId}`,
        type,
        success: resp => resolve(resp as any),
        error: err => reject(err),
      });
    });
  });
}

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

const landButtonView = (settings: ICanLand) => {
  const landWhenAbleButton = settings.canLandWhenAble
    ? createBtn('Land when able', 'default', 'landWhenAbleClicked')
    : '';
  return `<div>
    <p>This PR is not queued for Landing yet, click "Land" below or <a href="/index.html" target="_blank">here</a> for more information</p>
    <br>
    ${createBtn('Land!', 'primary', 'landClicked')}
    <span style="width: 10px; display: inline-block"></span>
    ${landWhenAbleButton}
  </div>`;
};

const isQueuedView = () => {
  return `<div>
    <p>This PR is queued for release now. See <a href="/current-state/index.html" target="_blank">here</a> to see the current queue</p>
  </div>`;
};

const checkingPullRequestView = () => {
  return `<div>
    <p>Checking pull request...</p>
  </div>`;
};

const notAllowedView = () => {
  return `<div>
    <p>You can not land this PR for the following reasons:</p>
    <ul id="errors"></ul>
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
// const notAllowedToLand = (reasons: {
//   isOpen?: boolean;
//   isApproved?: boolean;
//   isGreen?: boolean;
//   allTasksClosed?: boolean;
// }) => {
//   const isOpen = reasons.isOpen;
//   const isApproved = reasons.isApproved;
//   const isGreen = reasons.isGreen;
//   const allTasksClosed = reasons.allTasksClosed;

//   if (!isOpen) {
//     return `<div><p>PR is already closed!</p></div>`;
//   }
//   if (!isApproved) {
//     return `<div><p>Pull request needs to be approved</p></div>`;
//   }
//   if (!isGreen) {
//     return `<div><p>Pull Request needs a green build</p></div>`;
//   }
//   if (!allTasksClosed) {
//     return `<div><p>Pull Request needs all tasks completed (you might need to open and re-close them!)</p></div>`;
//   }
//   console.error(reasons);
//   return `<div>
//     <p>Error finding reason, please check console</p>
//   </div>`;
// };

const errorCreatingLandRequestView = (err: { reason?: string }) => {
  console.error(err);
  const reason = err.reason || "We honestly don't know... See error console";
  return `<div>
    <p>There was an error whilst queueing your land request:</p>
    <p style="color: red">${reason}</p>
  </div>`;
};

function getCanLand() {
  return proxy<ICanLand>('/can-land', 'POST');
}

// gets the user, repo and id vars
function getQueryStringVars() {
  const qs = window.location.search.substring(1);
  return queryString.parse(qs);
}

function landDependingOn(key: keyof ICanLand) {
  setView(checkingPullRequestView());

  getCanLand()
    .then(canLand => {
      if (canLand[key]) {
        return landPullRequest();
      } else {
        displayNotAllowed(canLand);
      }
    })
    .catch(err => {
      setView(errorCreatingLandRequestView(err));
    });
}

function landClicked() {
  return landDependingOn('canLand');
}

function landWhenAbleClicked() {
  return landDependingOn('canLandWhenAble');
}
// reusing this function for actual landrequests and for land when able requests
// THIS IS TERRIBLE - FIX ASAP
function landPullRequest(opts: { whenAbleFlag?: boolean } = {}) {
  const whenAbleFlag = opts.whenAbleFlag;

  const endPoint = whenAbleFlag ? '/land-when-able' : '/land';

  return proxy(endPoint, 'POST')
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

function displayNotAllowed(canLand: ICanLand) {
  setView(notAllowedView());

  for (const error of canLand.errors) {
    const li = document.createElement('li');
    li.innerText = error;
    document.querySelector('#errors')!.appendChild(li);
  }
}

function displayLandButton(canLand: ICanLand) {
  setView(landButtonView(canLand));
}

const qs = getQueryStringVars();
if (qs.state === 'OPEN') {
  getCanLand().then(canLand => {
    if (!canLand.canLand) {
      displayNotAllowed(canLand);
    } else {
      displayLandButton(canLand);
    }
  });
} else {
  setView(notAllowedView());
  document.querySelector('#errors')!.innerHTML =
    '<li>This PR is closed :(</li>';
}

// Wrapper function so that all the other HTML can all be wraped in this
function setView(innerHtml: string) {
  document.body.innerHTML = `<div class="releaseQueueView">
    ${innerHtml}
  </div>`;
}

// I've had to just add this hack as the functions declared here aren't available globally anymore
// I havent added the rest of the events since we're about to replace it, just FYI
window.landClicked = landClicked;
window.landWhenAbleClicked = landWhenAbleClicked;
