'use strict';

// This test is for https://github.com/ether/etherpad-lite/issues/1763
// Multiple browsers edit a pad and we check to ensure we can still perform
// a task quickly.
// We need to get up to 700 lines so the additional space breaks and enter keys
// in specialKeys are intentional.

const numberOfEdits = 100; // should be 1750
const specialKeys = ['{{}',
  '{backspace}',
  '{del}',
  '{downarrow}',
  '{end}',
  '{enter}',
  '{enter}',
  '{enter}',
  '{enter}',
  '{esc}',
  '{home}',
  '{insert}',
  '{leftarrow}',
  '{movetoend}',
  '{movetostart}',
  '{pagedown}',
  '{pageup}',
  '{rightarrow}',
  ' ',
  ' ',
  ' ',
  ' ',
  ' ',
  ' ',
  '{uparrow}']; // includes intentional white space

Cypress.Commands.add('iframe', {prevSubject: 'element'},
    ($iframe) => new Cypress.Promise((resolve) => {
      $iframe.ready(() => {
        resolve($iframe.contents().find('body'));
      });
    }));

describe(__filename, () => {
  it('Makes edits to pad', () => {
    let originalLineCount;
    cy.visit('http://127.0.0.1:9001/p/collab', {timeout: 120000});
    // Until we find a better way, this is required.
    cy.get('iframe[name="ace_outer"]', {timeout: 120000}).iframe()
        .find('iframe[name="ace_inner"]').iframe()
        .find('.ace-line:first')
        .should('be.visible');

    cy.get('iframe[name="ace_outer"]').iframe()
        .find('iframe[name="ace_inner"]').iframe()
        .find('div')
        .should(($lines) => {
          originalLineCount = $lines.length;
        });

    let i = 0;
    let enterKeyCount = 0;
    while (i < numberOfEdits) {
      const specialKey = specialKeys[Math.floor(Math.random() * specialKeys.length)];
      if (specialKey === '{enter}') enterKeyCount++;

      cy.get('iframe[name="ace_outer"]').iframe()
          .find('iframe[name="ace_inner"]').iframe()
          .type(specialKey);

      cy.get('iframe[name="ace_outer"]').iframe()
          .find('iframe[name="ace_inner"]').iframe()
          .type(`${Math.random().toString(36).slice(2)} ${Math.random().toString(36).slice(2)}`);
      // shameless copy/pasted from
      // https://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
      i++;
    }

    // Now all pad content should exist we can assert some things..
    cy.get('iframe[name="ace_outer"]').iframe()
        .find('iframe[name="ace_inner"]').iframe()
        .should('be.visible')
        .should(($inner) => {
          // editor exists
          expect($inner).to.have.length(1);
          // and is visible
          expect($inner).to.be.visible;
          // line count has grown
          expect($inner.find('div').length).to.be.at.least(enterKeyCount + originalLineCount);
        });

    // Now make one final edit and make sure it's visible within 10 ms.
    cy.get('iframe[name="ace_outer"]').iframe()
        .find('iframe[name="ace_inner"]').iframe()
        .type(`${Math.random().toString(36).slice(2)} ${Math.random().toString(36).slice(2)}`);

    cy.get('iframe[name="ace_outer"]').iframe()
        .find('iframe[name="ace_inner"]').iframe();
    // TODO. test
  });
});
