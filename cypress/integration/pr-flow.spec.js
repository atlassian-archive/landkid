import faker from 'faker';

const sessionID =
  's%3Ab9ex0ZJBLfMRscLx0qpJko1zcEs2PwXd.Ido3uJL%2F3L4iK%2B4YLhYpKPc5YFyuglsnUznMgs8gX8E';
const landkidURL = 'https://atlassian-frontend-landkid.dev.services.atlassian.com/current-state/';

const promisify = command => new Promise(resolve => command().then(resolve));
const request = config => promisify(() => cy.request(config));

describe('Testing Landkid', () => {
  const username = Cypress.env('BITBUCKET_USERNAME');
  const password = Cypress.env('BITBUCKET_APP_PASSWORD');
  const repo = Cypress.env('BITBUCKET_REPO');

  before(() => {
    cy.setCookie('landkid.sid', sessionID);
    cy.visit(landkidURL);
    sessionStorage.setItem('selectedTab', '2');
  });

  const createBranch = async (branchName, hackerPhrase, isSuccessful) => {
    let body = {
      message: hackerPhrase,
      branch: branchName,
      parents: 'master',
    };
    if (!isSuccessful) {
      body = { ...body, ['fail.txt']: '' };
    }
    return request({
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

  const createPR = async (branchName, hackerPhrase) =>
    request({
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

  const createPRSequence = async sequence =>
    Promise.all(
      sequence.map(isSuccessful => {
        const branchName = faker
          .fake('{{hacker.adjective}} {{hacker.noun}}')
          .replace(/\s+/g, '-')
          .replace('/', '')
          .toLowerCase();
        const hackerPhrase = faker.hacker.phrase();

        cy.log(branchName);

        return createBranch(branchName, hackerPhrase, isSuccessful)
          .then(() => createPR(branchName, hackerPhrase))
          .then(res => res.body.id);
      }),
    );

  const landPR = async prID =>
    request({
      url: '/api/create-fake',
      method: 'POST',
      body: {
        prId: prID,
      },
    });

  const getHistory = async () =>
    request({
      url: '/api/history?page=1',
      method: 'GET',
    });

  const waitForPRsToFinish = async ids =>
    new Promise(async resolve => {
      while (true) {
        const prHistory = (await getHistory()).body.history.filter(item =>
          ids.includes(item.request.pullRequestId),
        );
        if (prHistory.length === ids.length) {
          resolve(prHistory);
          break;
        }
        cy.wait(10000);
      }
    });

  it('Sequence of successful PRs', async () => {
    const PRSequence = [true];
    const ids = await createPRSequence(PRSequence);
    cy.log(ids);
    await Promise.all(ids.map(id => landPR(id)));

    const prHistory = await waitForPRsToFinish(ids);
    console.log(prHistory);
  });
});
