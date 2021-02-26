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
  cy.visit('http://127.0.0.1:9001/p/test', {timeout: 20000});
  const outer = cy.get('iframe[name="ace_outer"]', {timeout: 20000}).iframe();
  const inner = outer.find('iframe[name="ace_inner"]', {timeout: 20000}).iframe();

  outer.find('.line-number:first').should('have.text', '1');
  inner.find('.ace-line:first').should('be.visible');
});
