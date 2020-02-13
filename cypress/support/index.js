Cypress.Commands.overwrite('log', (originalFn, args) => {
  console.log(args);
  originalFn(args);
});
