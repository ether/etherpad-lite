'use strict';

helper.multipleUsers = {
  thisUser: null,
  otherUser: null,

  // open the same pad on different frames (allows concurrent editions to pad)
  async init() {
    // do some cleanup, in case any of the tests failed on the previous run
    const currentToken = _createTokenForCurrentUser();
    const otherToken = _createTokenForAnotherUser();
    _removeExistingTokensFromCookie();

    this.thisUser = {
      $frame: $('#iframe-container iframe'),
      token: currentToken,
      // we'll switch between pads, need to store current values of helper.pad*
      // to be able to restore those values later
      padChrome$: helper.padChrome$,
      padOuter$: helper.padOuter$,
      padInner$: helper.padInner$,
    };

    this.otherUser = {
      token: otherToken,
    };

    // need to perform as the other user, otherwise we'll get the userdup error message
    await this.performAsOtherUser(this._createFrameForOtherUser.bind(this));
  },

  async performAsOtherUser(action) {
    _startActingLike(this.otherUser);
    await action();
    // go back to initial state when we're done
    _startActingLike(this.thisUser);
  },

  close() {
    this.thisUser.$frame.attr('style', ''); // make the default ocopy the full height
    this.otherUser.$frame.remove();
  },

  async _loadJQueryCodeForOtherFrame() {
    const code = await $.get('/static/js/jquery.js');

    // make sure we don't override existing jquery
    const jQueryCode = `if(typeof $ === "undefined") {\n${code}\n}`;
    const sendkeysCode = await $.get('/tests/frontend/lib/sendkeys.js');
    const codesToLoad = [jQueryCode, sendkeysCode];

    this.otherUser.padChrome$ = _getFrameJQuery(codesToLoad, this.otherUser.$frame);
    this.otherUser.padOuter$ =
        _getFrameJQuery(codesToLoad, this.otherUser.padChrome$('iframe[name="ace_outer"]'));
    this.otherUser.padInner$ =
        _getFrameJQuery(codesToLoad, this.otherUser.padOuter$('iframe[name="ace_inner"]'));

    // update helper vars now that they are available
    helper.padChrome$ = this.otherUser.padChrome$;
    helper.padOuter$ = this.otherUser.padOuter$;
    helper.padInner$ = this.otherUser.padInner$;
  },

  async _createFrameForOtherUser() {
    // create the iframe
    const padUrl = this.thisUser.$frame.attr('src');
    this.otherUser.$frame = $(`<iframe id="other_pad" src="${padUrl}"></iframe>`);

    // place one iframe (visually) below the other
    this.thisUser.$frame.attr('style', 'height: 50%');
    this.otherUser.$frame.attr('style', 'height: 50%; top: 50%');
    this.otherUser.$frame.insertAfter(this.thisUser.$frame);

    // wait for other pad to load
    await new Promise((resolve) => this.otherUser.$frame.one('load', resolve));

    const $editorLoadingMessage = this.otherUser.$frame.contents().find('#editorloadingbox');
    const $errorMessageModal = this.thisUser.$frame.contents().find('#connectivity .userdup');

    await helper.waitForPromise(() => {
      const finishedLoadingOtherFrame = !$editorLoadingMessage.is(':visible');
      // make sure we don't get the userdup by mistake
      const didNotDetectUserDup = !$errorMessageModal.is(':visible');

      return finishedLoadingOtherFrame && didNotDetectUserDup;
    }, 50000);

    // need to get values for this.otherUser.pad* vars
    await this._loadJQueryCodeForOtherFrame();
  },
};

// adapted form helper.js on Etherpad code
const _getFrameJQuery = (codesToLoad, $iframe) => {
  const win = $iframe[0].contentWindow;
  const doc = win.document;

  for (let i = 0; i < codesToLoad.length; i++) {
    win.eval(codesToLoad[i]);
  }

  win.$.window = win;
  win.$.document = doc;

  return win.$;
};

const _getDocumentWithCookie = () => (
  helper.padChrome$
    ? helper.padChrome$.document
    : helper.multipleUsers.thisUser.$frame.get(0).contentDocument
);

const _setTokenOnCookie = (token) => {
  _getDocumentWithCookie().cookie = `token=${token};secure`;
};

const _getTokenFromCookie = () => {
  const fullCookie = _getDocumentWithCookie().cookie;
  return fullCookie.replace(/.*token=([^;]*).*/, '$1').trim();
};

const _createTokenForCurrentUser = () => (
  _getTokenFromCookie().replace(/-other_user.*/g, '')
);

const _createTokenForAnotherUser = () => {
  const currentToken = _createTokenForCurrentUser();
  return `${currentToken}-other_user${helper.randomString(4)}`;
};

const _startActingLike = (user) => {
  // update helper references, so other methods will act as if the main frame
  // was the one we're using from now on
  helper.padChrome$ = user.padChrome$;
  helper.padOuter$ = user.padOuter$;
  helper.padInner$ = user.padInner$;

  _setTokenOnCookie(user.token);
};

const _removeExistingTokensFromCookie = () => {
  // Expire cookie, to make sure it is removed by the browser.
  // See https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie#Example_4_Reset_the_previous_cookie
  _getDocumentWithCookie().cookie = 'token=foo;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/p';
  _getDocumentWithCookie().cookie = 'token=foo;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
};
