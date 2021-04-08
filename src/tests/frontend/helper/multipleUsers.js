'use strict';

helper.multipleUsers = {
  _user0: null,
  _user1: null,

  // open the same pad on different frames (allows concurrent editions to pad)
  async init() {
    this._user0 = {
      $frame: $('#iframe-container iframe'),
      token: getToken(),
      // we'll switch between pads, need to store current values of helper.pad*
      // to be able to restore those values later
      padChrome$: helper.padChrome$,
      padOuter$: helper.padOuter$,
      padInner$: helper.padInner$,
    };
    this._user1 = {};
    // Force generation of a new token.
    clearToken();
    // need to perform as the other user, otherwise we'll get the userdup error message
    await this.performAsOtherUser(this._createUser1Frame.bind(this));
  },

  async performAsOtherUser(action) {
    startActingLike(this._user1);
    await action();
    startActingLike(this._user0);
  },

  close() {
    this._user0.$frame.attr('style', ''); // make the default ocopy the full height
    this._user1.$frame.remove();
  },

  async _loadJQueryForUser1Frame() {
    const code = await $.get('/static/js/jquery.js');

    // make sure we don't override existing jquery
    const jQueryCode = `if(typeof $ === "undefined") {\n${code}\n}`;
    const sendkeysCode = await $.get('/tests/frontend/lib/sendkeys.js');
    const codesToLoad = [jQueryCode, sendkeysCode];

    this._user1.padChrome$ = getFrameJQuery(codesToLoad, this._user1.$frame);
    this._user1.padOuter$ =
        getFrameJQuery(codesToLoad, this._user1.padChrome$('iframe[name="ace_outer"]'));
    this._user1.padInner$ =
        getFrameJQuery(codesToLoad, this._user1.padOuter$('iframe[name="ace_inner"]'));

    // update helper vars now that they are available
    helper.padChrome$ = this._user1.padChrome$;
    helper.padOuter$ = this._user1.padOuter$;
    helper.padInner$ = this._user1.padInner$;
  },

  async _createUser1Frame() {
    // create the iframe
    const padUrl = this._user0.$frame.attr('src');
    this._user1.$frame = $('<iframe>').attr('id', 'user1_pad').attr('src', padUrl);

    // place one iframe (visually) below the other
    this._user0.$frame.attr('style', 'height: 50%');
    this._user1.$frame.attr('style', 'height: 50%; top: 50%');
    this._user1.$frame.insertAfter(this._user0.$frame);

    // wait for user1 pad to load
    await new Promise((resolve) => this._user1.$frame.one('load', resolve));

    const $editorLoadingMessage = this._user1.$frame.contents().find('#editorloadingbox');
    const $errorMessageModal = this._user0.$frame.contents().find('#connectivity .userdup');

    await helper.waitForPromise(() => {
      const loaded = !$editorLoadingMessage.is(':visible');
      // make sure we don't get the userdup by mistake
      const didNotDetectUserDup = !$errorMessageModal.is(':visible');
      return loaded && didNotDetectUserDup;
    }, 50000);

    // need to get values for this._user1.pad* vars
    await this._loadJQueryForUser1Frame();

    this._user1.token = getToken();
    if (this._user0.token === this._user1.token) {
      throw new Error('expected different token for user1');
    }
  },
};

// adapted form helper.js on Etherpad code
const getFrameJQuery = (codesToLoad, $iframe) => {
  const win = $iframe[0].contentWindow;
  const doc = win.document;

  for (let i = 0; i < codesToLoad.length; i++) {
    win.eval(codesToLoad[i]);
  }

  win.$.window = win;
  win.$.document = doc;

  return win.$;
};

const getCookies =
    () => helper.padChrome$.window.require('ep_etherpad-lite/static/js/pad_utils').Cookies;

const setToken = (token) => getCookies().set('token', token);

const getToken = () => getCookies().get('token');

const startActingLike = (user) => {
  // update helper references, so other methods will act as if the main frame
  // was the one we're using from now on
  helper.padChrome$ = user.padChrome$;
  helper.padOuter$ = user.padOuter$;
  helper.padInner$ = user.padInner$;

  if (helper.padChrome$) setToken(user.token);
};

const clearToken = () => getCookies().remove('token');
