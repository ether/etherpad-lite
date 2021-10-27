'use strict';

describe('chat hooks', function () {
  let hooks;
  const hooksBackup = {};

  const loadPad = async (opts = {}) => {
    await helper.aNewPad(opts);
    ({hooks} = helper.padChrome$.window.require('ep_etherpad-lite/static/js/pluginfw/plugin_defs'));
    for (const [name, defs] of Object.entries(hooks)) {
      hooksBackup[name] = defs;
      hooks[name] = [...defs];
    }
    await helper.showChat();
  };

  before(async function () {
    await loadPad();
  });

  afterEach(async function () {
    for (const [name, defs] of Object.entries(hooksBackup)) hooks[name] = [...defs];
    for (const name of Object.keys(hooks)) {
      if (hooksBackup[name] == null) delete hooks[name];
    }
  });

  const checkHook = async (hookName, checkFn) => {
    if (hooks[hookName] == null) hooks[hookName] = [];
    await new Promise((resolve, reject) => {
      hooks[hookName].push({
        hook_fn: async (hookName, context) => {
          if (checkFn == null) return;
          try {
            // Make sure checkFn is called only once.
            const _checkFn = checkFn;
            checkFn = null;
            await _checkFn(context);
          } catch (err) {
            reject(err);
            return;
          }
          resolve();
        },
      });
    });
  };

  describe('chatNewMessage', function () {
    for (const [desc, msg, wantRegEx] of [
      ['HTML is escaped', '<script>alert("foo");</script>', /^[^<]*$/],
      ['URL becomes a link', 'https://etherpad.org', /<a [^>]*href/],
    ]) {
      it(`text processing: ${desc}`, async function () {
        await Promise.all([
          checkHook('chatNewMessage', ({text}) => {
            expect(text).to.match(wantRegEx);
          }),
          helper.sendChatMessage(`${msg}{enter}`),
        ]);
      });
    }
  });
});
