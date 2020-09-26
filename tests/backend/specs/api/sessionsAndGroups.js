const assert = require('assert');
const supertest = require(__dirname + '/../../../../src/node_modules/supertest');
const fs = require('fs');
const settings = require(__dirname + '/../../../../src/node/utils/Settings');
const api = supertest(`http://${settings.ip}:${settings.port}`);
const path = require('path');

const filePath = path.join(__dirname, '../../../../APIKEY.txt');

const apiKey = fs.readFileSync(filePath, {encoding: 'utf-8'}).replace(/\n$/, '');
let apiVersion = 1;
let groupID = '';
let authorID = '';
let sessionID = '';
let padID = makeid();

describe('API Versioning', function(){
  it('errors if can not connect', function(done) {
    api.get('/api/')
    .expect(function(res){
      apiVersion = res.body.currentVersion;
      if (!res.body.currentVersion) throw new Error("No version set in API");
      return;
    })
    .expect(200, done)
  });
})

// BEGIN GROUP AND AUTHOR TESTS
/////////////////////////////////////
/////////////////////////////////////

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
      -> isPasswordProtected(padID) -- should be false
       -> setPassword(padID, password)
        -> isPasswordProtected(padID) -- should be true

-> listPadsOfAuthor(authorID)
*/

describe('API: Group creation and deletion', function() {
  it('createGroup', function(done) {
    api.get(endPoint('createGroup'))
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.groupID) throw new Error("Unable to create new Pad");
      groupID = res.body.data.groupID;
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('listSessionsOfGroup for empty group', function(done) {
    api.get(endPoint('listSessionsOfGroup')+"&groupID="+groupID)
    .expect(function(res){
      if(res.body.code !== 0 || res.body.data !== null) throw new Error("Sessions show as existing for this group");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('deleteGroup', function(done) {
    api.get(endPoint('deleteGroup')+"&groupID="+groupID)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Group failed to be deleted");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('createGroupIfNotExistsFor', function(done) {
    api.get(endPoint('createGroupIfNotExistsFor')+"&groupMapper=management")
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.groupID) throw new Error("Sessions show as existing for this group");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
});

describe('API: Author creation', function() {
  it('createGroup', function(done) {
    api.get(endPoint('createGroup'))
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.groupID) throw new Error("Unable to create new Pad");
      groupID = res.body.data.groupID;
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('createAuthor', function(done) {
    api.get(endPoint('createAuthor'))
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.authorID) throw new Error("Unable to create author");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('createAuthor with name', function(done) {
    api.get(endPoint('createAuthor')+"&name=john")
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.authorID) throw new Error("Unable to create user with name set");
      authorID = res.body.data.authorID; // we will be this author for the rest of the tests
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('createAuthorIfNotExistsFor', function(done) {
    api.get(endPoint('createAuthorIfNotExistsFor')+"&authorMapper=chris")
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.authorID) throw new Error("Unable to create author with mapper");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('getAuthorName', function(done) {
    api.get(endPoint('getAuthorName')+"&authorID="+authorID)
    .expect(function(res){
      if(res.body.code !== 0 || res.body.data !== "john") throw new Error("Unable to get Author Name from Author ID");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
});

describe('API: Sessions', function() {
  it('createSession', function(done) {
    api.get(endPoint('createSession')+"&authorID="+authorID+"&groupID="+groupID+"&validUntil=999999999999")
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.sessionID) throw new Error("Unable to create Session");
      sessionID = res.body.data.sessionID;
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('getSessionInfo', function(done) {
    api.get(endPoint('getSessionInfo')+"&sessionID="+sessionID)
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.groupID || !res.body.data.authorID || !res.body.data.validUntil) throw new Error("Unable to get Session info");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('listSessionsOfGroup', function(done) {
    api.get(endPoint('listSessionsOfGroup')+"&groupID="+groupID)
    .expect(function(res){
      if(res.body.code !== 0 || typeof res.body.data !== "object") throw new Error("Unable to get sessions of a group");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('deleteSession', function(done) {
    api.get(endPoint('deleteSession')+"&sessionID="+sessionID)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Unable to delete a session");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('getSessionInfo of deleted session', function(done) {
    api.get(endPoint('getSessionInfo')+"&sessionID="+sessionID)
    .expect(function(res){
      if(res.body.code !== 1) throw new Error("Session was not properly deleted");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
});

describe('API: Group pad management', function() {
  it('listPads', function(done) {
    api.get(endPoint('listPads')+"&groupID="+groupID)
    .expect(function(res){
      if(res.body.code !== 0 || res.body.data.padIDs.length !== 0) throw new Error("Group already had pads for some reason"+res.body.data.padIDs);
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('createGroupPad', function(done) {
    api.get(endPoint('createGroupPad')+"&groupID="+groupID+"&padName="+padID)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Unable to create group pad");
      padID = res.body.data.padID;
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('listPads after creating a group pad', function(done) {
    api.get(endPoint('listPads')+"&groupID="+groupID)
    .expect(function(res){
      if(res.body.code !== 0 || res.body.data.padIDs.length !== 1) throw new Error("Group isnt listing this pad");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
});

describe('API: Pad security', function() {
  it('getPublicStatus', function(done) {
    api.get(endPoint('getPublicStatus')+"&padID="+padID)
    .expect(function(res){
      if(res.body.code !== 0 || res.body.data.publicstatus) throw new Error("Unable to get public status of this pad");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('setPublicStatus', function(done) {
    api.get(endPoint('setPublicStatus')+"&padID="+padID+"&publicStatus=true")
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Setting status did not work");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('getPublicStatus after changing public status', function(done) {
    api.get(endPoint('getPublicStatus')+"&padID="+padID)
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.publicStatus) throw new Error("Setting public status of this pad did not work");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('isPasswordProtected', function(done) {
    api.get(endPoint('isPasswordProtected')+"&padID="+padID)
    .expect(function(res){
      if(res.body.code !== 0 || res.body.data.isPasswordProtected) throw new Error("Pad is password protected by default");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('setPassword', function(done) {
    api.get(endPoint('setPassword')+"&padID="+padID+"&password=test")
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Unabe to set password");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });

  it('isPasswordProtected after setting password', function(done) {
    api.get(endPoint('isPasswordProtected')+"&padID="+padID)
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.isPasswordProtected) throw new Error("Pad password protection has not applied");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
});

// NOT SURE HOW TO POPULAT THIS /-_-\
///////////////////////////////////////
///////////////////////////////////////

describe('API: Misc', function() {
  it('listPadsOfAuthor', function(done) {
    api.get(endPoint('listPadsOfAuthor')+"&authorID="+authorID)
    .expect(function(res){
      if(res.body.code !== 0 || res.body.data.padIDs.length !== 0) throw new Error("Pad password protection has not applied");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
});



const endPoint = function(point) {
  return '/api/'+apiVersion+'/'+point+'?apikey='+apiKey;
}

function makeid()
{
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
