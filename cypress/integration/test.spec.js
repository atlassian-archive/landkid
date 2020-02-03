import faker from 'faker';

const promisify = command => new Promise((resolve, reject) => command().then(() => resolve()));

describe('Testing Landkid', () => {
  const username = Cypress.env('BITBUCKET_USERNAME');
  const password = Cypress.env('BITBUCKET_APP_PASSWORD');
  const repo = Cypress.env('BITBUCKET_REPO');

  before(() => {
    cy.setCookie(
      'landkid.sid',
      's%3AmaVW0HdryQ9Q0AEWOPznkNkI9xZZ88aC.hl8xVzU1hWpd6XLSf9vLUta1ljSOEuXfpSlnYnxtvmw',
    );
    cy.visit('https://jgardner.ngrok.io/current-state');
    sessionStorage.setItem('selectedTab', '2');
  });

  const createBranch = (branchName, hackerPhrase, isSuccessful) => {
    let body = {
      message: hackerPhrase,
      branch: branchName,
      parents: 'master',
    };
    if (!isSuccessful) {
      body = { ...body, ['fail.txt']: '' };
    }
    return cy.request({
      method: 'POST',
      url: `https://api.bitbucket.org/2.0/repositories/${username}/${repo}/src`,
      body,
      auth: {
        username,
        password,
      },
      form: true,
    });
  };

  const createPR = (branchName, hackerPhrase) =>
    cy.request({
      method: 'POST',
      url: `https://api.bitbucket.org/2.0/repositories/${username}/${repo}/pullrequests`,
      body: {
        title: branchName,
        source: {
          branch: {
            name: branchName,
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
    });

  const createPRSequence = (sequence, ids) => {
    sequence.forEach(isSuccessful => {
      const branchName = faker
        .fake('{{hacker.adjective}} {{hacker.noun}}')
        .replace(/\s+/g, '-')
        .replace('/', '')
        .toLowerCase();
      const hackerPhrase = faker.hacker.phrase();

      cy.log(branchName);

      createBranch(branchName, hackerPhrase, isSuccessful);
      createPR(branchName, hackerPhrase).then(res => ids.push(res.body.id));
    });
  };

  const landPR = prID =>
    promisify(() =>
      cy.request({
        url: 'https://jgardner.ngrok.io/api/create-fake',
        method: 'POST',
        body: {
          prId: prID,
        },
      }),
    );

  it('Sequence of successful PRs', async () => {
    const PRSequence = [true, true, true];
    const ids = [];
    createPRSequence(PRSequence, ids);
    await promisify(() => cy.waitUntil(() => ids.length === PRSequence.length));
    await Promise.all(ids.map(id => landPR(id)));
    expect(ids.length).to.equal(PRSequence.length);
  });
});
