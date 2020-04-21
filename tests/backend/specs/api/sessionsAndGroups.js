var assert = require('assert')
 supertest = require(__dirname+'/../../../../src/node_modules/supertest'),
        fs = require('fs'),
  settings = require(__dirname + '/../../../../src/node/utils/Settings'),
       api = supertest('http://'+settings.ip+":"+settings.port),
      path = require('path');

var filePath = path.join(__dirname, '../../../../APIKEY.txt');

var apiKey = fs.readFileSync(filePath,  {encoding: 'utf-8'});
apiKey = apiKey.replace(/\n$/, "");
var apiVersion = 1;
var testPadId = makeid();
var groupID = "";
var authorID = "";
var sessionID = "";
var padID = makeid();

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

describe('createGroup', function(){
  it('creates a new group', function(done) {
    api.get(endPoint('createGroup'))
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.groupID) throw new Error("Unable to create new Pad");
      groupID = res.body.data.groupID;
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('listSessionsOfGroup', function(){
  it('Lists the session of a group', function(done) {
    api.get(endPoint('listSessionsOfGroup')+"&groupID="+groupID)
    .expect(function(res){
      if(res.body.code !== 0 || res.body.data !== null) throw new Error("Sessions show as existing for this group");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('deleteGroup', function(){
  it('Deletes a group', function(done) {
    api.get(endPoint('deleteGroup')+"&groupID="+groupID)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Group failed to be deleted");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('createGroupIfNotExistsFor', function(){
  it('Creates a group if one doesnt exist for mapper 0', function(done) {
    api.get(endPoint('createGroupIfNotExistsFor')+"&groupMapper=management")
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.groupID) throw new Error("Sessions show as existing for this group");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('createGroup', function(){
  it('creates a new group', function(done) {
    api.get(endPoint('createGroup'))
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.groupID) throw new Error("Unable to create new Pad");
      groupID = res.body.data.groupID;
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('createAuthor', function(){
  it('Creates an author with a name set', function(done) {
    api.get(endPoint('createAuthor'))
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.authorID) throw new Error("Unable to create author");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('createAuthor', function(){
  it('Creates an author with a name set', function(done) {
    api.get(endPoint('createAuthor')+"&name=john")
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.authorID) throw new Error("Unable to create user with name set");
      authorID = res.body.data.authorID; // we will be this author for the rest of the tests
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('createAuthorIfNotExistsFor', function(){
  it('Creates an author if it doesnt exist already and provides mapping', function(done) {
    api.get(endPoint('createAuthorIfNotExistsFor')+"&authorMapper=chris")
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.authorID) throw new Error("Unable to create author with mapper");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getAuthorName', function(){
  it('Gets the author name', function(done) {
    api.get(endPoint('getAuthorName')+"&authorID="+authorID)
    .expect(function(res){
      if(res.body.code !== 0 || res.body.data !== "john") throw new Error("Unable to get Author Name from Author ID");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

// BEGIN SESSION TESTS
///////////////////////////////////////
///////////////////////////////////////

describe('createSession', function(){
  it('Creates a session for an Author', function(done) {
    api.get(endPoint('createSession')+"&authorID="+authorID+"&groupID="+groupID+"&validUntil=999999999999")
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.sessionID) throw new Error("Unable to create Session");
      sessionID = res.body.data.sessionID;
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getSessionInfo', function(){
  it('Gets session inf', function(done) {
    api.get(endPoint('getSessionInfo')+"&sessionID="+sessionID)
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.groupID || !res.body.data.authorID || !res.body.data.validUntil) throw new Error("Unable to get Session info");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('listSessionsOfGroup', function(){
  it('Gets sessions of a group', function(done) {
    api.get(endPoint('listSessionsOfGroup')+"&groupID="+groupID)
    .expect(function(res){
      if(res.body.code !== 0 || typeof res.body.data !== "object") throw new Error("Unable to get sessions of a group");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('deleteSession', function(){
  it('Deletes a session', function(done) {
    api.get(endPoint('deleteSession')+"&sessionID="+sessionID)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Unable to delete a session");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getSessionInfo', function(){
  it('Gets session info', function(done) {
    api.get(endPoint('getSessionInfo')+"&sessionID="+sessionID)
    .expect(function(res){
      if(res.body.code !== 1) throw new Error("Session was not properly deleted");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

// GROUP PAD MANAGEMENT
///////////////////////////////////////
///////////////////////////////////////

describe('listPads', function(){
  it('Lists Pads of a Group', function(done) {
    api.get(endPoint('listPads')+"&groupID="+groupID)
    .expect(function(res){
      if(res.body.code !== 0 || res.body.data.padIDs.length !== 0) throw new Error("Group already had pads for some reason"+res.body.data.padIDs);
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('createGroupPad', function(){
  it('Creates a Group Pad', function(done) {
    api.get(endPoint('createGroupPad')+"&groupID="+groupID+"&padName="+padID)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Unable to create group pad");
      padID = res.body.data.padID;
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('listPads', function(){
  it('Lists Pads of a Group', function(done) {
    api.get(endPoint('listPads')+"&groupID="+groupID)
    .expect(function(res){
      if(res.body.code !== 0 || res.body.data.padIDs.length !== 1) throw new Error("Group isnt listing this pad");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

// PAD SECURITY /-_-\
///////////////////////////////////////
///////////////////////////////////////

describe('getPublicStatus', function(){
  it('Gets the public status of a pad', function(done) {
    api.get(endPoint('getPublicStatus')+"&padID="+padID)
    .expect(function(res){
      if(res.body.code !== 0 || res.body.data.publicstatus) throw new Error("Unable to get public status of this pad");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('setPublicStatus', function(){
  it('Sets the public status of a pad', function(done) {
    api.get(endPoint('setPublicStatus')+"&padID="+padID+"&publicStatus=true")
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Setting status did not work");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getPublicStatus', function(){
  it('Gets the public status of a pad', function(done) {
    api.get(endPoint('getPublicStatus')+"&padID="+padID)
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.publicStatus) throw new Error("Setting public status of this pad did not work");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('isPasswordProtected', function(){
  it('Gets the public status of a pad', function(done) {
    api.get(endPoint('isPasswordProtected')+"&padID="+padID)
    .expect(function(res){
      if(res.body.code !== 0 || res.body.data.isPasswordProtected) throw new Error("Pad is password protected by default");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('setPassword', function(){
  it('Gets the public status of a pad', function(done) {
    api.get(endPoint('setPassword')+"&padID="+padID+"&password=test")
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Unabe to set password");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('isPasswordProtected', function(){
  it('Gets the public status of a pad', function(done) {
    api.get(endPoint('isPasswordProtected')+"&padID="+padID)
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.isPasswordProtected) throw new Error("Pad password protection has not applied");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})


// NOT SURE HOW TO POPULAT THIS /-_-\
///////////////////////////////////////
///////////////////////////////////////

describe('listPadsOfAuthor', function(){
  it('Gets the Pads of an Author', function(done) {
    api.get(endPoint('listPadsOfAuthor')+"&authorID="+authorID)
    .expect(function(res){
      if(res.body.code !== 0 || res.body.data.padIDs.length !== 0) throw new Error("Pad password protection has not applied");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})



var endPoint = function(point){
  return '/api/'+apiVersion+'/'+point+'?apikey='+apiKey;
}

function makeid()
{
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for( var i=0; i < 5; i++ ){
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
