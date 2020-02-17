describe('Sequence of successful PRs', () => {
  let prStates = [];

  before(() => {
    cy.visitLandkid();
  });

  beforeEach(() => {
    const branch1 = `success-${+new Date() + 1}`;
    const branch2 = `success-${+new Date() + 2}`;
    const branch3 = `success-${+new Date() + 3}`;
    cy.createLandRequest(branch1, true);
    cy.createLandRequest(branch2, true);
    cy.createLandRequest(branch3, true);
    cy.waitForAllFinished([branch1, branch2, branch3]).then(res => (prStates = res));
  });

  it('All Successful', async () => {
    cy.log(prStates);
    expect(prStates).to.deep.equal(['success', 'success', 'success']);
  });
});
