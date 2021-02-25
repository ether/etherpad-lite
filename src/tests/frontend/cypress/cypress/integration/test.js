'use strict';
/* globals cy */
/* eslint-disable-next-line mocha/no-mocha-arrows, mocha/no-synchronous-tests */
it('Pad content exists', () => { /* eslint-disable-line mocha/no-global-tests */
  cy.visit('http://127.0.0.1:9001/p/test');
  getIframeBody('ace_outer').find('.line-number:first').should('have.text', '1');
  getIframeBody('ace_inner').find('.ace-line').should('be.visible');
});

// get the iframe > document > body
// and retry until the body element is not empty
const getIframeBody = (iframeName) => cy
    .get(`iframe[name="${iframeName}"]`)
    .its('0.contentDocument.body').should('not.be.empty')
    .then(cy.wrap);
// wraps "body" DOM element to allow
// chaining more Cypress commands, like ".find(...)"
// https://on.cypress.io/wrap
