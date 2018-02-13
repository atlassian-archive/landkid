const endpoint = window.location.origin;

function loadState() {
  fetch(endpoint + '/api/current-state')
    .then(resp => resp.json())
    .then(res => {
      var runningEl = document.querySelector('#running');
      var queueEl = document.querySelector('#current-queue');
      var lockedEl = document.querySelector('#locked');
      var allowedUsersEl = document.querySelector('#allowed-users');

      runningEl.textContent = window.JSON.stringify(res.running, null, 2);

      queueEl.innerHTML = '';
      res.queue.forEach(queueItem => {
        var queueItemEl = document.createElement('pre');
        queueItemEl.textContent = window.JSON.stringify(queueItem, null, 2);
        queueEl.appendChild(queueItemEl);
      });

      lockedEl.textContent = window.JSON.stringify(res.locked, null, 2);
      if (res.locked === true) {
        lockedEl.style.color = 'red';
      }

      allowedUsersEl.textContent = window.JSON.stringify(
        res.usersAllowedToMerge,
        null,
        2
      );
    });
}

loadState();
