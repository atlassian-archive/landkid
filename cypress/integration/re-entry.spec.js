describe('Fail then Success', () => {
  let prStates = [];

  before(() => {
    cy.visitLandkid();
  });

  beforeEach(() => {
    // const branch1 = `will-fail-${+new Date()}`;
    const branch2 = `re-entry-${+new Date()}`;
    // cy.createLandRequest(branch1, false);
    cy.createLandRequest(branch2, true);
    cy.waitForAllFinished([branch1]).then(res => (prStates = res));
  });

  it('Request is re-entered into queue and succeeds after the failure of dependency', async () => {
    cy.log(prStates);
    expect(prStates).to.deep.equal(['fail', 'success']);
  });
});
