import axios from 'axios';
import faker from 'faker';
import FormData from 'form-data';

async function createBranchWithNewFile(app, targetBranch, shouldFail) {
  const branchName = faker
    .fake('{{hacker.adjective}} {{hacker.noun}}')
    .replace(/\s+/g, '-')
    .replace('/', '')
    .toLowerCase();
  const hackerPhrase = faker.hacker.phrase();
  const fileName = `fake-files/${shouldFail ? 'fail' : branchName}.txt`;
  const filePath = `${__dirname}/${fileName}`;
  cy.log(branchName, filePath);

  return cy
    .writeFile(filePath, hackerPhrase)
    .then(() => {
      cy.log('written file');
      const formData = new FormData();
      formData.append('message', hackerPhrase);
      formData.append('branch', branchName);
      formData.append('parents', targetBranch);
      formData.append(fileName, cy.readFile(filePath));
      return app({
        method: 'POST',
        url: 'src',
        data: formData.getBuffer(),
        headers: formData.getHeaders(),
      });
    })
    .then(() => ({ branchName, hackerPhrase }))
    .catch(cy.log);
}

async function createPullRequest(app, targetBranch, shouldFail) {
  return createBranchWithNewFile(app, targetBranch, shouldFail)
    .then(({ branchName, hackerPhrase }) =>
      app.post('pullrequests', {
        title: branchName,
        source: {
          branch: {
            name: branchName,
          },
        },
        destination: {
          branch: {
            name: targetBranch,
          },
        },
        description: hackerPhrase,
        close_source_branch: true,
      }),
    )
    .then(response => {
      cy.log(`Created pull request ${response.data.links.html.href}`);
      return response.data.id;
    })
    .catch(cy.log);
}

export default function(targetBranch, prSequence) {
  cy.log(`${targetBranch}, ${prSequence}`);
  const username = process.env.BITBUCKET_USERNAME;
  const password = process.env.BITBUCKET_APP_PASSWORD;
  const repo = process.env.BITBUCKET_REPO;

  const app = axios.create({
    baseURL: `https://api.bitbucket.org/2.0/repositories/${username}/${repo}`,
    auth: {
      username,
      password,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return Promise.all(prSequence.map(pr => createPullRequest(app, targetBranch, pr === '0')));
}
