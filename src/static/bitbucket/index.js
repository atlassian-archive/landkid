function getCurrentQueue() {
  fetch('https://6e0b089e.ngrok.io/api/current-queue')
    .then(resp => console.log('success ', resp.json()))
    .catch(err => console.error('error ', err));
}

// Fetches the user, repo and id vars
function getQueryStringVars() {
  const queryString = window.location.search.substring(1);
  return window.Qs.parse(queryString);
}

getCurrentQueue();
