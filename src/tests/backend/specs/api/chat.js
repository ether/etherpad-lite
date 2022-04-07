'use strict';

const assert = require('assert').strict;
const common = require('../../common');

let agent;
const apiKey = common.apiKey;
let apiVersion = 1;
let authorID = '';
const padID = makeid();
const timestamp = Date.now();

const endPoint = (point) => `/api/${apiVersion}/${point}?apikey=${apiKey}`;

describe(__filename, function () {
  before(async function () { agent = await common.init(); });

  describe('API Versioning', function () {
    it('errors if can not connect', async function () {
      await agent.get('/api/')
          .expect(200)
          .expect((res) => {
            assert(res.body.currentVersion);
            apiVersion = res.body.currentVersion;
          });
    });
  });

  describe('message sequence', function () {
    it('createPad', async function () {
      await agent.get(`${endPoint('createPad')}&padID=${padID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
          });
    });

    it('createAuthor', async function () {
      await agent.get(endPoint('createAuthor'))
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert(res.body.data.authorID);
            authorID = res.body.data.authorID; // we will be this author for the rest of the tests
          });
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
});

function makeid() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
