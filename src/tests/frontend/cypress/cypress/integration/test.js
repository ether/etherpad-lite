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
    cy.visit('http://127.0.0.1:9001/p/test');
    cy.wait(2000);
    cy.get('iframe[name="ace_outer"]').iframe()
        .find('.line-number:first')
        .should('have.text', '1');
    cy.wait(500);
    cy.get('iframe[name="ace_outer"]').iframe()
        .find('iframe[name="ace_inner"]').iframe()
        .find('.ace-line:first')
        .should('be.visible')
        .should('have.text', 'Welcome to Etherpad!');
  });
});
