const assert = require('assert').strict;
const common = require('../../common');
const supertest = require(`${__dirname}/../../../../src/node_modules/supertest`);
const settings = require(`${__dirname}/../../../../src/node/utils/Settings`);
const api = supertest(`http://${settings.ip}:${settings.port}`);

const apiKey = common.apiKey;
let apiVersion = 1;
let groupID = '';
let authorID = '';
let sessionID = '';
let padID = makeid();

describe(__filename, function () {
  describe('API Versioning', function () {
    it('errors if can not connect', async function () {
      await api.get('/api/')
          .expect(200)
          .expect((res) => {
            assert(res.body.currentVersion);
            apiVersion = res.body.currentVersion;
          });
    });
  });

  // BEGIN GROUP AND AUTHOR TESTS
  // ///////////////////////////////////
  // ///////////////////////////////////

  /* Tests performed
  -> createGroup() -- should return a groupID
   -> listSessionsOfGroup(groupID) -- should be 0
    -> deleteGroup(groupID)
     -> createGroupIfNotExistsFor(groupMapper) -- should return a groupID

      -> createAuthor([name]) -- should return an authorID
       -> createAuthorIfNotExistsFor(authorMapper [, name]) -- should return an authorID
        -> getAuthorName(authorID) -- should return a name IE "john"

  -> createSession(groupID, authorID, validUntil)
   -> getSessionInfo(sessionID)
    -> listSessionsOfGroup(groupID) -- should be 1
     -> deleteSession(sessionID)
      -> getSessionInfo(sessionID) -- should have author id etc in

  -> listPads(groupID) -- should be empty array
   -> createGroupPad(groupID, padName [, text])
    -> listPads(groupID) -- should be empty array
     -> getPublicStatus(padId)
      -> setPublicStatus(padId, status)
       -> getPublicStatus(padId)

  -> listPadsOfAuthor(authorID)
  */

  describe('API: Group creation and deletion', function () {
    it('createGroup', async function () {
      await api.get(endPoint('createGroup'))
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert(res.body.data.groupID);
            groupID = res.body.data.groupID;
          });
    });

    it('listSessionsOfGroup for empty group', async function () {
      await api.get(`${endPoint('listSessionsOfGroup')}&groupID=${groupID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert.equal(res.body.data, null);
          });
    });

    it('deleteGroup', async function () {
      await api.get(`${endPoint('deleteGroup')}&groupID=${groupID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
          });
    });

    it('createGroupIfNotExistsFor', async function () {
      await api.get(`${endPoint('createGroupIfNotExistsFor')}&groupMapper=management`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert(res.body.data.groupID);
          });
    });
  });

  describe('API: Author creation', function () {
    it('createGroup', async function () {
      await api.get(endPoint('createGroup'))
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert(res.body.data.groupID);
            groupID = res.body.data.groupID;
          });
    });

    it('createAuthor', async function () {
      await api.get(endPoint('createAuthor'))
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert(res.body.data.authorID);
          });
    });

    it('createAuthor with name', async function () {
      await api.get(`${endPoint('createAuthor')}&name=john`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert(res.body.data.authorID);
            authorID = res.body.data.authorID; // we will be this author for the rest of the tests
          });
    });

    it('createAuthorIfNotExistsFor', async function () {
      await api.get(`${endPoint('createAuthorIfNotExistsFor')}&authorMapper=chris`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert(res.body.data.authorID);
          });
    });

    it('getAuthorName', async function () {
      await api.get(`${endPoint('getAuthorName')}&authorID=${authorID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert.equal(res.body.data, 'john');
          });
    });
  });

  describe('API: Sessions', function () {
    it('createSession', async function () {
      await api.get(`${endPoint('createSession')
      }&authorID=${authorID}&groupID=${groupID}&validUntil=999999999999`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert(res.body.data.sessionID);
            sessionID = res.body.data.sessionID;
          });
    });

    it('getSessionInfo', async function () {
      await api.get(`${endPoint('getSessionInfo')}&sessionID=${sessionID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert(res.body.data.groupID);
            assert(res.body.data.authorID);
            assert(res.body.data.validUntil);
          });
    });

    it('listSessionsOfGroup', async function () {
      await api.get(`${endPoint('listSessionsOfGroup')}&groupID=${groupID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert.equal(typeof res.body.data, 'object');
          });
    });

    it('deleteSession', async function () {
      await api.get(`${endPoint('deleteSession')}&sessionID=${sessionID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
          });
    });

    it('getSessionInfo of deleted session', async function () {
      await api.get(`${endPoint('getSessionInfo')}&sessionID=${sessionID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 1);
          });
    });
  });

  describe('API: Group pad management', function () {
    it('listPads', async function () {
      await api.get(`${endPoint('listPads')}&groupID=${groupID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert.equal(res.body.data.padIDs.length, 0);
          });
    });

    it('createGroupPad', async function () {
      await api.get(`${endPoint('createGroupPad')}&groupID=${groupID}&padName=${padID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            padID = res.body.data.padID;
          });
    });

    it('listPads after creating a group pad', async function () {
      await api.get(`${endPoint('listPads')}&groupID=${groupID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert.equal(res.body.data.padIDs.length, 1);
          });
    });
  });

  describe('API: Pad security', function () {
    it('getPublicStatus', async function () {
      await api.get(`${endPoint('getPublicStatus')}&padID=${padID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert.equal(res.body.data.publicStatus, false);
          });
    });

    it('setPublicStatus', async function () {
      await api.get(`${endPoint('setPublicStatus')}&padID=${padID}&publicStatus=true`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
          });
    });

    it('getPublicStatus after changing public status', async function () {
      await api.get(`${endPoint('getPublicStatus')}&padID=${padID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert.equal(res.body.data.publicStatus, true);
          });
    });
  });

  // NOT SURE HOW TO POPULAT THIS /-_-\
  // /////////////////////////////////////
  // /////////////////////////////////////

  describe('API: Misc', function () {
    it('listPadsOfAuthor', async function () {
      await api.get(`${endPoint('listPadsOfAuthor')}&authorID=${authorID}`)
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            assert.equal(res.body.code, 0);
            assert.equal(res.body.data.padIDs.length, 0);
          });
    });
  });
});


const endPoint = function (point) {
  return `/api/${apiVersion}/${point}?apikey=${apiKey}`;
};

function makeid() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
