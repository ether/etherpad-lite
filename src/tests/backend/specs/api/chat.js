'use strict';

const assert = require('assert').strict;
const common = require('../../common');
const plugins = require('../../../../static/js/pluginfw/plugins');
const settings = require('../../../../node/utils/Settings');

let agent;
const apiKey = common.apiKey;
let apiVersion = 1;
let authorID = '';
const padID = makeid();
const timestamp = Date.now();

const endPoint = (point) => `/api/${apiVersion}/${point}?apikey=${apiKey}`;

describe(__filename, function () {
  const backups = {settings: {}};

  before(async function () {
    backups.settings.integratedChat = settings.integratedChat;
    settings.integratedChat = true;
    await plugins.update();
    agent = await common.init();
    await agent.get('/api/')
        .expect(200)
        .expect((res) => {
          assert(res.body.currentVersion);
          apiVersion = res.body.currentVersion;
        });
    await agent.get(`${endPoint('createPad')}&padID=${padID}`)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          assert.equal(res.body.code, 0);
        });
    await agent.get(endPoint('createAuthor'))
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          assert.equal(res.body.code, 0);
          assert(res.body.data.authorID);
          authorID = res.body.data.authorID; // we will be this author for the rest of the tests
        });
  });

  after(async function () {
    Object.assign(settings, backups.settings);
    await plugins.update();
  });

  describe('settings.integratedChat = true', function () {
    beforeEach(async function () {
      settings.integratedChat = true;
    });

    it('appendChatMessage', async function () {
      await agent.get(`${endPoint('appendChatMessage')}&padID=${padID}&text=blalblalbha` +
                `&authorID=${authorID}&time=${timestamp}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
          });
    });

    it('getChatHead', async function () {
      await agent.get(`${endPoint('getChatHead')}&padID=${padID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert.equal(res.body.data.chatHead, 0);
          });
    });

    it('getChatHistory', async function () {
      await agent.get(`${endPoint('getChatHistory')}&padID=${padID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert.equal(res.body.data.messages.length, 1);
          });
    });
  });

  describe('settings.integratedChat = false', function () {
    beforeEach(async function () {
      settings.integratedChat = false;
    });

    it('appendChatMessage returns an error', async function () {
      await agent.get(`${endPoint('appendChatMessage')}&padID=${padID}&text=blalblalbha` +
                `&authorID=${authorID}&time=${timestamp}`)
          .expect(500)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 2);
          });
    });

    it('getChatHead returns an error', async function () {
      await agent.get(`${endPoint('getChatHead')}&padID=${padID}`)
          .expect(500)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 2);
          });
    });

    it('getChatHistory returns an error', async function () {
      await agent.get(`${endPoint('getChatHistory')}&padID=${padID}`)
          .expect(500)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 2);
          });
    });
  });
});

function makeid() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
