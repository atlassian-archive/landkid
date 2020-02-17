import faker from 'faker';

const username = 'jackrgardner';
const password = Cypress.env('BITBUCKET_APP_PASSWORD');
const repo = 'changeset-testing';

Cypress.Commands.overwrite('log', (originalFn, args) => {
  console.log(args);
  originalFn(args);
});

Cypress.Commands.add('visitLandkid', () => {
  cy.setCookie('landkid.sid', Cypress.env('LANDKID_SESSION_ID'));
  cy.visit('https://jgardner.ngrok.io/current-state/');
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

Cypress.Commands.add('waitForAllFinished', (prTitles, waitTime = 30000) => {
  const getStatuses = ids =>
    cy
      .request({
        url: `/api/landrequests?ids=${ids.join(',')}`,
        method: 'GET',
      })
      .then(res => res.body);
  const getHistory = () =>
    cy
      .request({
        url: '/api/history?page=1',
        method: 'GET',
      })
      .then(res => {
        const prHistory = res.body.history.filter(item =>
          prTitles.includes(item.request.pullRequest.title),
        );
        if (prHistory.length === prTitles.length)
          return getStatuses(prHistory.map(item => item.requestId));
        cy.log('PRs not finished, polling /history again');
        cy.wait(waitTime);
        getHistory();
      });
  return getHistory();
});
