require('unfetch/polyfill');
const distanceInWords = require('date-fns/distance_in_words_to_now');

var endpoint = window.location.origin;

function loadState() {
  fetch(endpoint + '/api/current-state')
    .then(resp => resp.json())
    .then(state => {
      setDisplay(state);
    });
}

function setDisplay(state) {
  var uptimeEl = document.querySelector('#uptime');
  var runningEl = document.querySelector('#running');
  var queueEl = document.querySelector('#current-queue');
  var lockedEl = document.querySelector('#locked');
  var pausedEl = document.querySelector('#paused');
  var allowedUsersEl = document.querySelector('#allowed-users');

  uptimeEl.textContent = distanceInWords(state.started);

  runningEl.textContent = window.JSON.stringify(state.running, null, 2);

  queueEl.innerHTML = '';
  state.queue.forEach(queueItem => {
    var queueItemEl = document.createElement('pre');
    queueItemEl.textContent = window.JSON.stringify(queueItem, null, 2);
    queueEl.appendChild(queueItemEl);
  });

  lockedEl.textContent = window.JSON.stringify(state.locked, null, 2);

  if (state.paused && state.pausedReason) {
    pausedEl.textContent = state.pausedReason;
  } else {
    pausedEl.textContent = window.JSON.stringify(state.paused, null, 2);
  }

  allowedUsersEl.textContent = window.JSON.stringify(
    state.usersAllowedToMerge,
    null,
    2
  );
}

loadState();
