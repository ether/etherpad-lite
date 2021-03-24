'use strict';

helper.multipleUsers = {
  thisUser: null,
  otherUser: null,
};

// open the same pad on the same frame (does not allow concurrent editions to pad)
helper.multipleUsers.loadSamePadAsAnotherUser = (done, tokenForOtherUser) => {
  // change user
  const token = tokenForOtherUser || _createTokenForAnotherUser();
  _removeExistingTokensFromCookie();
  _setTokenOnCookie(token);

  // reload pad
  const padId = helper.padChrome$.window.clientVars.padId;
  helper.newPad(done, padId);
};

// open the same pad on different frames (allows concurrent editions to pad)
helper.multipleUsers.openSamePadOnWithAnotherUser = (done) => {
  const self = helper.multipleUsers;

  // do some cleanup, in case any of the tests failed on the previous run
  const currentToken = _createTokenForCurrentUser();
  const otherToken = _createTokenForAnotherUser();
  _removeExistingTokensFromCookie();

  self.thisUser = {
    $frame: $('#iframe-container iframe'),
    token: currentToken,
    // we'll switch between pads, need to store current values of helper.pad*
    // to be able to restore those values later
    padChrome$: helper.padChrome$,
    padOuter$: helper.padOuter$,
    padInner$: helper.padInner$,
  };

  self.otherUser = {
    token: otherToken,
  };

  // need to perform as the other user, otherwise we'll get the userdup error message
  self.performAsOtherUser(_createFrameForOtherUser, done);
};

helper.multipleUsers.performAsOtherUser = (action, done) => {
  const self = helper.multipleUsers;

  self.startActingLikeOtherUser();
  action(() => {
    // go back to initial state when we're done
    self.startActingLikeThisUser();
    done();
  });
};

helper.multipleUsers.closePadForOtherUser = () => {
  const self = helper.multipleUsers;

  self.thisUser.$frame.attr('style', ''); // make the default ocopy the full height
  self.otherUser.$frame.remove();
};

helper.multipleUsers.startActingLikeOtherUser = () => {
  const self = helper.multipleUsers;
  _startActingLike(self.otherUser);
};

helper.multipleUsers.startActingLikeThisUser = () => {
  const self = helper.multipleUsers;
  _startActingLike(self.thisUser);
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

const _loadJQueryCodeForOtherFrame = (done) => {
  const self = helper.multipleUsers;

  $.get('/static/js/jquery.js').done((code) => {
    // make sure we don't override existing jquery
    const jQueryCode = `if(typeof $ === "undefined") {\n${code}\n}`;
    $.get('/tests/frontend/lib/sendkeys.js').done((sendkeysCode) => {
      const codesToLoad = [jQueryCode, sendkeysCode];

      self.otherUser.padChrome$ = _getFrameJQuery(codesToLoad, self.otherUser.$frame);
      self.otherUser.padOuter$ = _getFrameJQuery(codesToLoad, self.otherUser.padChrome$('iframe[name="ace_outer"]'));
      self.otherUser.padInner$ = _getFrameJQuery(codesToLoad, self.otherUser.padOuter$('iframe[name="ace_inner"]'));

      // update helper vars now that they are available
      helper.padChrome$ = self.otherUser.padChrome$;
      helper.padOuter$ = self.otherUser.padOuter$;
      helper.padInner$ = self.otherUser.padInner$;

      done();
    });
  });
};

const _createFrameForOtherUser = (done) => {
  const self = helper.multipleUsers;

  // create the iframe
  const padUrl = self.thisUser.$frame.attr('src');
  self.otherUser.$frame = $(`<iframe id="other_pad" src="${padUrl}"></iframe>`);

  // place one iframe (visually) below the other
  self.thisUser.$frame.attr('style', 'height: 50%');
  self.otherUser.$frame.attr('style', 'height: 50%; top: 50%');
  self.otherUser.$frame.insertAfter(self.thisUser.$frame);

  // wait for other pad to load
  self.otherUser.$frame.one('load', () => {
    const $editorLoadingMessage = self.otherUser.$frame.contents().find('#editorloadingbox');
    const $errorMessageModal = self.thisUser.$frame.contents().find('#connectivity .userdup');

    helper.waitFor(() => {
      const finishedLoadingOtherFrame = !$editorLoadingMessage.is(':visible');
      // make sure we don't get the userdup by mistake
      const didNotDetectUserDup = !$errorMessageModal.is(':visible');

      return finishedLoadingOtherFrame && didNotDetectUserDup;
    }, 50000).done(() => {
      // need to get values for self.otherUser.pad* vars
      _loadJQueryCodeForOtherFrame(done);
    });
  });
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
