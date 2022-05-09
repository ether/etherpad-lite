'use strict';

const ChatMessage = require('../../../static/js/ChatMessage');
const {Pad} = require('../../../node/db/Pad');
const assert = require('assert').strict;
const common = require('../common');
const padManager = require('../../../node/db/PadManager');
const pluginDefs = require('../../../static/js/pluginfw/plugin_defs');
const plugins = require('../../../static/js/pluginfw/plugins');
const settings = require('../../../node/utils/Settings');

const logger = common.logger;

const checkHook = async (hookName, checkFn) => {
  if (pluginDefs.hooks[hookName] == null) pluginDefs.hooks[hookName] = [];
  let hook;
  try {
    await new Promise((resolve, reject) => {
      hook = {
        hook_fn: async (hookName, context) => {
          if (checkFn == null) return;
          logger.debug(`hook ${hookName} invoked`);
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
      };
      pluginDefs.hooks[hookName].push(hook);
    });
  } finally {
    pluginDefs.hooks[hookName] = pluginDefs.hooks[hookName].filter((h) => h !== hook);
  }
};

const sendMessage = async (socket, data) => (
  await common.sendMessage(socket, {type: 'COLLABROOM', component: 'pad', data}));
const sendChat = async (socket, message) => (
  await sendMessage(socket, {type: 'CHAT_MESSAGE', message}));

describe(__filename, function () {
  const backups = {settings: {}};
  let clientVars;
  const padId = 'testChatPad';
  let socket;

  const connect = async () => {
    socket = await common.connect();
    ({data: clientVars} = await common.handshake(socket, padId));
  };

  before(async function () {
    backups.settings.integratedChat = settings.integratedChat;
  });

  beforeEach(async function () {
    if (await padManager.doesPadExist(padId)) {
      const pad = await padManager.getPad(padId);
      await pad.remove();
    }
  });

  afterEach(async function () {
    if (socket) {
      socket.close();
      socket = null;
    }
  });

  after(async function () {
    Object.assign(settings, backups.settings);
    await plugins.update();
  });

  describe('settings.integratedChat = true', function () {
    before(async function () {
      settings.integratedChat = true;
      await plugins.update();
    });

    beforeEach(async function () {
      await connect();
    });

    describe('chatNewMessage hook', function () {
      it('message', async function () {
        const start = Date.now();
        await Promise.all([
          checkHook('chatNewMessage', ({message}) => {
            assert(message != null);
            assert(message instanceof ChatMessage);
            assert.equal(message.authorId, clientVars.userId);
            assert.equal(message.text, this.test.title);
            assert(message.time >= start);
            assert(message.time <= Date.now());
          }),
          sendChat(socket, {text: this.test.title}),
        ]);
      });

      it('pad', async function () {
        await Promise.all([
          checkHook('chatNewMessage', ({pad}) => {
            assert(pad != null);
            assert(pad instanceof Pad);
            assert.equal(pad.id, padId);
          }),
          sendChat(socket, {text: this.test.title}),
        ]);
      });

      it('padId', async function () {
        await Promise.all([
          checkHook('chatNewMessage', (context) => {
            assert.equal(context.padId, padId);
          }),
          sendChat(socket, {text: this.test.title}),
        ]);
      });

      it('mutations propagate', async function () {
        const listen = async (type) => await new Promise((resolve) => {
          const handler = (msg) => {
            if (msg.type !== 'COLLABROOM') return;
            if (msg.data == null || msg.data.type !== type) return;
            resolve(msg.data);
            socket.off('message', handler);
          };
          socket.on('message', handler);
        });

        const modifiedText = `${this.test.title} <added changes>`;
        const customMetadata = {foo: this.test.title};
        await Promise.all([
          checkHook('chatNewMessage', ({message}) => {
            message.text = modifiedText;
            message.customMetadata = customMetadata;
          }),
          (async () => {
            const {message} = await listen('CHAT_MESSAGE');
            assert(message != null);
            assert.equal(message.text, modifiedText);
            assert.deepEqual(message.customMetadata, customMetadata);
          })(),
          sendChat(socket, {text: this.test.title}),
        ]);
        // Simulate fetch of historical chat messages when a pad is first loaded.
        await Promise.all([
          (async () => {
            const {messages: [message]} = await listen('CHAT_MESSAGES');
            assert(message != null);
            assert.equal(message.text, modifiedText);
            assert.deepEqual(message.customMetadata, customMetadata);
          })(),
          sendMessage(socket, {type: 'GET_CHAT_MESSAGES', start: 0, end: 0}),
        ]);
      });
    });
  });

  describe('settings.integratedChat = false', function () {
    before(async function () {
      settings.integratedChat = false;
      await plugins.update();
    });

    beforeEach(async function () {
      await connect();
    });

    it('clientVars.chatHead is unset', async function () {
      assert(!('chatHead' in clientVars), `chatHead should be unset, is ${clientVars.chatHead}`);
    });

    it('rejects CHAT_MESSAGE messages', async function () {
      await assert.rejects(sendChat(socket, {text: 'this is a test'}), /unknown message type/);
    });

    it('rejects GET_CHAT_MESSAGES messages', async function () {
      const msg = {type: 'GET_CHAT_MESSAGES', start: 0, end: 0};
      await assert.rejects(sendMessage(socket, msg), /unknown message type/);
    });
  });
});
