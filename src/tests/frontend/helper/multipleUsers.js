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
    this._user1.padChrome$ = await getFrameJQuery(this._user1.$frame, true, true);
    this._user1.padOuter$ =
        await getFrameJQuery(this._user1.padChrome$('iframe[name="ace_outer"]'), true, false);
    this._user1.padInner$ =
        await getFrameJQuery(this._user1.padOuter$('iframe[name="ace_inner"]'), true, true);

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

// copied from helper.js
const getFrameJQuery = async ($iframe, includeJquery = false, includeSendkeys = false) => {
  const win = $iframe[0].contentWindow;
  const doc = win.document;

  const load = async (url) => {
    const elem = doc.createElement('script');
    elem.setAttribute('src', url);
    const p = new Promise((resolve, reject) => {
      const handler = (evt) => {
        elem.removeEventListener('load', handler);
        elem.removeEventListener('error', handler);
        if (evt.type === 'error') return reject(new Error(`failed to load ${url}`));
        resolve();
      };
      elem.addEventListener('load', handler);
      elem.addEventListener('error', handler);
    });
    doc.head.appendChild(elem);
    await p;
  };

  if (!win.$ && includeJquery) await load('../../static/js/vendors/jquery.js');
  if (!win.bililiteRange && includeSendkeys) await load('../tests/frontend/lib/sendkeys.js');

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
