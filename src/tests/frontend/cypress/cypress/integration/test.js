'use strict';

Cypress.Commands.add('iframe', { prevSubject: 'element' }, function($iframe) {
  return new Cypress.Promise( function (resolve) {
    $iframe.ready(function() {
      resolve($iframe.contents().find('body'));
    });
  });
});

/* globals cy */
/* eslint-disable-next-line mocha/no-mocha-arrows, mocha/no-synchronous-tests */
it('Pad content exists', function() { /* eslint-disable-line mocha/no-global-tests */
  cy.visit('http://127.0.0.1:9001/p/test', {timeout: 60000});
  cy.wait(2000)
  cy.get('iframe[name="ace_outer"]', {timeout: 10000}).iframe()
      .find('.line-number:first', {timeout: 10000})
      .should('have.text', '1')
  cy.wait(500)
  cy.get('iframe[name="ace_outer"]', {timeout: 10000}).iframe()
      .find('iframe[name="ace_inner"]', {timeout: 10000}).iframe()
      .find('.ace-line:first')
      .should('be.visible')
      .should('have.text', 'Welcome to Etherpad!');
});
