import { failed, reentryFail, doubleReentrySuccess } from './utils';

describe('Re-entry into queue', () => {
  let branch1, branch2, branch3;
  let prs;

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
    cy.waitForAllFinished([branch1, branch2, branch3], 25000).then(res => (prs = res));
  });

  it('Requests are re-entered into queue after the failure of dependency', async () => {
    assert(failed.validate(prs[branch1].statuses));
    assert(reentryFail.validate(prs[branch2].statuses));
    assert(doubleReentrySuccess.validate(prs[branch3].statuses));
  });

  afterEach(() => {
    cy.removePR(prs[branch1].prId, branch1);
    cy.removePR(prs[branch2].prId, branch2);
  });
});
