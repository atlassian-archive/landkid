const sessionID =
  's%3AedBn3bC_Rr8Uqu4SGtkXb9hCAGJvqF7g.vwWe6yD2GQOsYZ3t6zJi4i0vGOceNZ1o0pTMLVMV2VU';
const landkidURL = 'https://atlassian-frontend-landkid.dev.services.atlassian.com/current-state/';

describe('Testing Landkid', () => {
  let prStates;

  before(() => {
    cy.setCookie('landkid.sid', sessionID);
    cy.visit(landkidURL);
    sessionStorage.setItem('selectedTab', '2');
  });

  beforeEach(() => {
    prStates = [];
    const branch1 = `success-${+new Date() + 1}`;
    const branch2 = `success-${+new Date() + 2}`;
    const branch3 = `success-${+new Date() + 3}`;
    cy.createLandRequest(branch1, true);
    cy.createLandRequest(branch2, true);
    cy.createLandRequest(branch3, true);
    cy.waitForAllFinished([branch1, branch2, branch3]).then(res => (prStates = res));
  });

  it('Sequence of successful PRs', async () => {
    cy.log(prStates);
    expect(prStates).to.deep.equal(['success', 'success', 'success']);
  });
});
