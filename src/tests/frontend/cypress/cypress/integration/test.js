'use strict';

// TODO: See if there's an ESLint environment for Cypress.
/* global Cypress, cy */

Cypress.Commands.add('iframe', {prevSubject: 'element'},
    ($iframe) => new Cypress.Promise((resolve) => {
      $iframe.ready(() => {
        resolve($iframe.contents().find('body'));
      });
    }));

describe(__filename, function () {
  it('Pad content exists', async function () {
    cy.visit('http://127.0.0.1:9001/p/test', {timeout: 60000});
    cy.wait(2000);
    cy.get('iframe[name="ace_outer"]', {timeout: 10000}).iframe()
        .find('.line-number:first', {timeout: 10000})
        .should('have.text', '1');
    cy.wait(500);
    cy.get('iframe[name="ace_outer"]', {timeout: 10000}).iframe()
        .find('iframe[name="ace_inner"]', {timeout: 10000}).iframe()
        .find('.ace-line:first')
        .should('be.visible')
        .should('have.text', 'Welcome to Etherpad!');
  });
});
