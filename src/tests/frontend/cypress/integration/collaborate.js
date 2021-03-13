'use strict';

Cypress.Commands.add('iframe', {prevSubject: 'element'},
    ($iframe) => new Cypress.Promise((resolve) => {
      $iframe.ready(() => {
        resolve($iframe.contents().find('body'));
      });
    }));

describe(__filename, () => {
  it('Pad content exists', () => {
    cy.visit('http://127.0.0.1:9001/p/collab');
    cy.get('iframe[name="ace_outer"]', {timeout: 10000}).iframe()
        .find('.line-number:first')
        .should('have.text', '1');
    cy.get('iframe[name="ace_outer"]').iframe()
        .find('iframe[name="ace_inner"]').iframe()
        .find('.ace-line:first')
        .should('be.visible');
    cy.get('iframe[name="ace_outer"]').iframe()
        .find('iframe[name="ace_inner"]').iframe()
        .find('.ace-line:first')
        .type('Hello, World');
    cy.get('iframe[name="ace_outer"]').iframe()
        .find('iframe[name="ace_inner"]').iframe()
        .find('.ace-line:first')
        .type('Hello, World2');
  });
});
