import { failed, reentry } from './utils';

describe('Fail then Success', () => {
  let branch1;
  let branch2;
  let prStatuses;

  before(() => {
    cy.visitLandkid();
  });

  beforeEach(() => {
    branch1 = `will-fail-${+new Date()}`;
    branch2 = `re-entry-${+new Date()}`;
    cy.createLandRequest(branch1, false);
    cy.createLandRequest(branch2, true);
    cy.waitForAllFinished([branch1, branch2]).then(res => (prStatuses = res));
  });

  it('Request is re-entered into queue and succeeds after the failure of dependency', async () => {
    assert(failed.validate(prStatuses[branch1]));
    assert(reentry.validate(prStatuses[branch2]));
  });
});
