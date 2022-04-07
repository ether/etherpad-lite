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
          .expect((res) => {
            apiVersion = res.body.currentVersion;
            assert(res.body.currentVersion);
          })
          .expect(200);
    });
  });

  // BEGIN GROUP AND AUTHOR TESTS
  // ///////////////////////////////////
  // ///////////////////////////////////

  /* Tests performed
  -> createPad(padID)
   -> createAuthor([name]) -- should return an authorID
    -> appendChatMessage(padID, text, authorID, time)
     -> getChatHead(padID)
      -> getChatHistory(padID)
  */

  describe('createPad', function () {
    it('creates a new Pad', async function () {
      await agent.get(`${endPoint('createPad')}&padID=${padID}`)
          .expect((res) => {
            assert.equal(res.body.code, 0);
          })
          .expect('Content-Type', /json/)
          .expect(200);
    });
  });

  describe('createAuthor', function () {
    it('Creates an author with a name set', async function () {
      await agent.get(endPoint('createAuthor'))
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert(res.body.data.authorID);
            authorID = res.body.data.authorID; // we will be this author for the rest of the tests
          })
          .expect('Content-Type', /json/)
          .expect(200);
    });
  });

  describe('appendChatMessage', function () {
    it('Adds a chat message to the pad', async function () {
      await agent.get(`${endPoint('appendChatMessage')}&padID=${padID}&text=blalblalbha` +
                `&authorID=${authorID}&time=${timestamp}`)
          .expect((res) => {
            assert.equal(res.body.code, 0);
          })
          .expect('Content-Type', /json/)
          .expect(200);
    });
  });


  describe('getChatHead', function () {
    it('Gets the head of chat', async function () {
      await agent.get(`${endPoint('getChatHead')}&padID=${padID}`)
          .expect((res) => {
            assert.equal(res.body.data.chatHead, 0);
            assert.equal(res.body.code, 0);
          })
          .expect('Content-Type', /json/)
          .expect(200);
    });
  });

  describe('getChatHistory', function () {
    it('Gets Chat History of a Pad', async function () {
      await agent.get(`${endPoint('getChatHistory')}&padID=${padID}`)
          .expect((res) => {
            assert.equal(res.body.data.messages.length, 1);
            assert.equal(res.body.code, 0);
          })
          .expect('Content-Type', /json/)
          .expect(200);
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
