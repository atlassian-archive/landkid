import faker from 'faker';

const username = 'jackrgardner';
const password = Cypress.env('BITBUCKET_APP_PASSWORD');
const repo = 'atlassian-frontend-landkid-test-repo';

Cypress.Commands.overwrite('log', (originalFn, args) => {
  console.log(args);
  originalFn(args);
});

Cypress.Commands.add('visitLandkid', () => {
  cy.setCookie('landkid.sid', Cypress.env('LANDKID_SESSION_ID'));
  cy.visit('https://atlassian-frontend-landkid.dev.services.atlassian.com/current-state/');
});

Cypress.Commands.add('createLandRequest', (title, isSuccessful) => {
  const hackerPhrase = faker.hacker.phrase();

  cy.log(title);

  let body = {
    message: hackerPhrase,
    branch: title,
    parents: 'master',
  };
  if (!isSuccessful) {
    body = { ...body, ['fail.txt']: '' };
  }

  cy.request({
    method: 'POST',
    url: `https://api.bitbucket.org/2.0/repositories/${username}/${repo}/src`,
    body,
    auth: {
      username,
      password,
    },
    form: true,
  });

  cy.request({
    method: 'POST',
    url: `https://api.bitbucket.org/2.0/repositories/${username}/${repo}/pullrequests`,
    body: {
      title: title,
      source: {
        branch: {
          name: title,
        },
      },
      destination: {
        branch: {
          name: 'master',
        },
      },
      description: hackerPhrase,
      close_source_branch: true,
    },
    auth: {
      username,
      password,
    },
  }).then(res =>
    cy.request({
      url: '/api/create-fake',
      method: 'POST',
      body: {
        prId: res.body.id,
      },
    }),
  );
});

Cypress.Commands.add('waitForAllFinished', (prTitles, waitTime = 10000) => {
  const getStatuses = (ids, idToTitle, idToPrId) =>
    cy
      .request({
        method: 'GET',
        url: `/api/landrequests?ids=${ids.join(',')}`,
      })
      .then(res => {
        const transformed = {};
        Object.keys(res.body.statuses).forEach(id => {
          transformed[idToTitle[id]] = {
            prId: idToPrId[id],
            statuses: res.body.statuses[id].map(item => item.state),
          };
        });
        return transformed;
      });
  const getHistory = () =>
    cy
      .request({
        method: 'GET',
        url: '/api/history?page=1',
      })
      .then(res => {
        const history = res.body.history.filter(item =>
          prTitles.includes(item.request.pullRequest.title),
        );
        if (history.length === prTitles.length) {
          const idToTitle = {};
          const idToPrId = {};
          for (const item of history) {
            idToTitle[item.requestId] = item.request.pullRequest.title;
            idToPrId[item.requestId] = item.request.pullRequestId;
          }
          return getStatuses(history.map(item => item.requestId), idToTitle, idToPrId);
        }
        cy.log('PRs not finished, polling /history again');
        cy.wait(waitTime);
        getHistory();
      });
  cy.wait(2 * waitTime);
  return getHistory();
});

Cypress.Commands.add('removePR', (id, branchName) => {
  cy.request({
    url: `https://api.bitbucket.org/2.0/repositories/${username}/${repo}/pullrequests/${id}/decline`,
    method: 'POST',
    auth: {
      username,
      password,
    },
  });
  cy.request({
    url: `https://api.bitbucket.org/2.0/repositories/${username}/${repo}/refs/branches/${branchName}`,
    method: 'DELETE',
    auth: {
      username,
      password,
    },
  });
});
