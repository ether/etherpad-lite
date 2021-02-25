'use strict';

/* eslint-disable-next-line mocha/no-mocha-arrows, mocha/no-synchronous-tests */
it('Pad content exists', () => {
  cy.visit('http://127.0.0.1:9001/p/test');
  getIframeBodyOuter().find('.line-number:first').should('have.text', '1');
  getIframeBodyInner().find('.ace-line').should('be.visible');
});

const getIframeBodyOuter = () => {
  // get the iframe > document > body
  // and retry until the body element is not empty
  return cy
  .get('iframe[name="ace_outer"]')
  .its('0.contentDocument.body').should('not.be.empty')
  // wraps "body" DOM element to allow
  // chaining more Cypress commands, like ".find(...)"
  // https://on.cypress.io/wrap
  .then(cy.wrap)
}


const getIframeBodyInner = () => {
  // get the iframe > document > body
  // and retry until the body element is not empty
  return cy
  .get('iframe[name="ace_inner"]')
  .its('0.contentDocument.body').should('not.be.empty')
  // wraps "body" DOM element to allow
  // chaining more Cypress commands, like ".find(...)"
  // https://on.cypress.io/wrap
  .then(cy.wrap)
}
