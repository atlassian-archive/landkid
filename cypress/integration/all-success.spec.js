import { successful } from './utils';

describe('Sequence of successful PRs', () => {
  let branch1, branch2, branch3;
  let prStatuses;

  before(() => {
    cy.visitLandkid();
  });

  beforeEach(() => {
    branch1 = `success-${+new Date() + 1}`;
    branch2 = `success-${+new Date() + 2}`;
    branch3 = `success-${+new Date() + 3}`;
    cy.createLandRequest(branch1, true);
    cy.createLandRequest(branch2, true);
    cy.createLandRequest(branch3, true);
    cy.waitForAllFinished([branch1, branch2, branch3]).then(res => (prStatuses = res));
  });

  it('All Successful', async () => {
    assert(successful.validate(prStatuses[branch1]));
    assert(successful.validate(prStatuses[branch2]));
    assert(successful.validate(prStatuses[branch3]));
  });
});
