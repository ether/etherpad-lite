'use strict';

describe('embed links', function () {
  const objectify = function (str) {
    const hash = {};
    const parts = str.split('&');
    for (let i = 0; i < parts.length; i++) {
      const keyValue = parts[i].split('=');
      hash[keyValue[0]] = keyValue[1];
    }
    return hash;
  };

  const checkiFrameCode = function (embedCode, readonly) {
    // turn the code into an html element
    const $embediFrame = $(embedCode);

    // read and check the frame attributes
    const width = $embediFrame.attr('width');
    const height = $embediFrame.attr('height');
    const name = $embediFrame.attr('name');
    expect(width).to.be('100%');
    expect(height).to.be('600');
    expect(name).to.be(readonly ? 'embed_readonly' : 'embed_readwrite');

    // parse the url
    const src = $embediFrame.attr('src');
    const questionMark = src.indexOf('?');
    const url = src.substr(0, questionMark);
    const paramsStr = src.substr(questionMark + 1);
    const params = objectify(paramsStr);

    const expectedParams = {
      showControls: 'true',
      showChat: 'true',
      showLineNumbers: 'true',
      useMonospaceFont: 'false',
    };

    // check the url
    if (readonly) {
      expect(url.indexOf('r.') > 0).to.be(true);
    } else {
      expect(url).to.be(helper.padChrome$.window.location.href);
    }

    // check if all parts of the url are like expected
    expect(params).to.eql(expectedParams);
  };

  describe('read and write', function () {
    // create a new pad before each test run
    beforeEach(async function () {
      await helper.aNewPad();
    });

    describe('the share link', function () {
      it('is the actual pad url', async function () {
        const chrome$ = helper.padChrome$;

        // open share dropdown
        chrome$('.buttonicon-embed').click();

        // get the link of the share field + the actual pad url and compare them
        const shareLink = chrome$('#linkinput').val();
        const padURL = chrome$.window.location.href;
        expect(shareLink).to.be(padURL);
      });
    });

    describe('the embed as iframe code', function () {
      it('is an iframe with the the correct url parameters and correct size', async function () {
        const chrome$ = helper.padChrome$;

        // open share dropdown
        chrome$('.buttonicon-embed').click();

        // get the link of the share field + the actual pad url and compare them
        const embedCode = chrome$('#embedinput').val();

        checkiFrameCode(embedCode, false);
      });
    });
  });

  describe('when read only option is set', function () {
    beforeEach(async function () {
      await helper.aNewPad();
    });

    describe('the share link', function () {
      it('shows a read only url', async function () {
        const chrome$ = helper.padChrome$;

        // open share dropdown
        chrome$('.buttonicon-embed').click();
        chrome$('#readonlyinput').click();
        chrome$('#readonlyinput:checkbox:not(:checked)').attr('checked', 'checked');

        // get the link of the share field + the actual pad url and compare them
        const shareLink = chrome$('#linkinput').val();
        const containsReadOnlyLink = shareLink.indexOf('r.') > 0;
        expect(containsReadOnlyLink).to.be(true);
      });
    });

    describe('the embed as iframe code', function () {
      it('is an iframe with the the correct url parameters and correct size', async function () {
        const chrome$ = helper.padChrome$;

        // open share dropdown
        chrome$('.buttonicon-embed').click();
        // check read only checkbox, a bit hacky
        chrome$('#readonlyinput').click();
        chrome$('#readonlyinput:checkbox:not(:checked)').attr('checked', 'checked');


        // get the link of the share field + the actual pad url and compare them
        const embedCode = chrome$('#embedinput').val();

        checkiFrameCode(embedCode, true);
      });
    });
  });
});
