'use strict';
/* globals cy */
/* eslint-disable-next-line mocha/no-mocha-arrows, mocha/no-synchronous-tests */
it('Pad content exists', () => { /* eslint-disable-line mocha/no-global-tests */
  cy.visit('http://127.0.0.1:9001/p/test');
  const outer = cy.get('iframe[name="ace_outer"]').iframe();
  const inner = outer.find('iframe[name="ace_inner"]').iframe();

  outer.find('.line-number:first').should('have.text', '1');
  inner.find('.ace-line:first').should('be.visible');
});
