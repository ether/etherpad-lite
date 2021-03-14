'use strict';

// This test is for https://github.com/ether/etherpad-lite/issues/1763
// Multiple browsers edit a pad and we check to ensure we can still perform
// a task quickly.
// We need to get up to 700 lines so the additional space breaks and enter keys
// in specialKeys are intentional.

const numberOfEdits = 100;
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
    cy.visit('http://127.0.0.1:9001/p/collab');
    // Until we find a better way, this is required.
    // cy.wait(10000); // wait for Minified JS to be built...
    cy.get('iframe[name="ace_outer"]', {timeout: 30000}).iframe()
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
          .find('.ace-line:last')
          .type(specialKey);

      cy.get('iframe[name="ace_outer"]').iframe()
          .find('iframe[name="ace_inner"]').iframe()
          .find('.ace-line:last')
          .type(randomString(16));

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
  });
});

const randomString = (stringLength) => {
  let randomstring = '';
  for (let i = 0; i < stringLength; i++) {
    const charNumber = Math.random() * (300 - 1) + 1;
    const str = String.fromCharCode(parseInt(charNumber));
    // This method generates sufficient noise
    // It also includes white space and non ASCII Chars
    randomstring += str;
  }
  return randomstring;
};
