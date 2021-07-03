'use strict';

describe('urls', function () {
  // Returns the first text element. Note that any change to the text element will result in the
  // element being replaced with another object.
  const txt = () => helper.padInner$('div').first();

  before(async function () {
    await helper.aNewPad();
  });

  beforeEach(async function () {
    await helper.clearPad();
  });

  describe('entering a URL makes a link', function () {
    for (const url of ['https://etherpad.org', 'www.etherpad.org']) {
      it(url, async function () {
        this.timeout(5000);
        const url = 'https://etherpad.org';
        await helper.edit(url);
        await helper.waitForPromise(() => txt().find('a').length === 1, 2000);
        const link = txt().find('a');
        expect(link.attr('href')).to.be(url);
        expect(link.text()).to.be(url);
      });
    }
  });

  describe('special characters inside URL', function () {
    for (const char of '-:@_.,~%+/?=&#!;()[]$\'*') {
      const url = `https://etherpad.org/${char}foo`;
      it(url, async function () {
        await helper.edit(url);
        await helper.waitForPromise(() => txt().find('a').length === 1);
        const link = txt().find('a');
        expect(link.attr('href')).to.be(url);
        expect(link.text()).to.be(url);
      });
    }
  });

  describe('punctuation after URL is ignored', function () {
    for (const char of ':.,;?!)]\'*') {
      const want = 'https://etherpad.org';
      const input = want + char;
      it(input, async function () {
        await helper.edit(input);
        await helper.waitForPromise(() => txt().find('a').length === 1);
        const link = txt().find('a');
        expect(link.attr('href')).to.be(want);
        expect(link.text()).to.be(want);
      });
    }
  });
});
