'use strict';

describe('caret focus', function () {
  for (const params of [{}, {focusOnEditor: 'true'}, {focusOnEditor: 'false'}]) {
    const wantFocus = params.focusOnEditor !== 'false';

    describe(`focusOnEditor=${params.focusOnEditor}`, function () {
      before(async function () {
        await helper.aNewPad({params});
      });

      it(`does${wantFocus ? '' : ' not'} focus`, async function () {
        if (wantFocus) {
          expect(helper.padChrome$.document.activeElement)
              .to.be(helper.padChrome$.document.querySelector('iframe[name="ace_outer"]'));
          expect(helper.padOuter$.document.activeElement)
              .to.be(helper.padOuter$.document.querySelector('iframe[name="ace_inner"]'));
          expect(helper.padInner$.document.activeElement)
              .to.be(helper.padInner$.document.body);
        } else {
          expect(helper.padChrome$.document.activeElement)
              .to.not.be(helper.padChrome$.document.querySelector('iframe[name="ace_outer"]'));
        }
      });
    });
  }
});
