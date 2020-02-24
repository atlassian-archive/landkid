import { failed, reentry, doubleReentry } from './utils';

describe('Re-entry into queue', () => {
  let branch1, branch2, branch3;
  let prStatuses;

  before(() => {
    cy.visitLandkid();
  });

  beforeEach(() => {
    branch1 = `will-fail-${+new Date()}`;
    branch2 = `re-entry-fail-${+new Date()}`;
    branch3 = `re-entry-success-${+new Date()}`;
    cy.createLandRequest(branch1, false);
    cy.createLandRequest(branch2, false);
    cy.createLandRequest(branch3, true);
    cy.waitForAllFinished([branch1, branch2, branch3]).then(res => (prStatuses = res));
  });

  it('Requests are re-entered into queue after the failure of dependency', async () => {
    assert(failed.validate(prStatuses[branch1]));
    assert(reentry.validate(prStatuses[branch2]));
    assert(doubleReentry.validate(prStatuses[branch3]));
  });
});
