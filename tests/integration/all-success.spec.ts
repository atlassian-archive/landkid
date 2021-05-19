import { validate, successful } from './utils';

describe('Sequence of successful PRs', () => {
  let branch1: string, branch2: string, branch3: string;
  let prs: Record<string, any>;

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
    cy.waitForAllFinished([branch1, branch2, branch3]).then(res => (prs = res));
  });

  it('All Successful', async () => {
    assert(await validate(prs[branch1].statuses, successful));
    assert(await validate(prs[branch2].statuses, successful));
    assert(await validate(prs[branch3].statuses, successful));
  });
});
