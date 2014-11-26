var assert = require('assert')
 supertest = require('supertest'),
        fs = require('fs'),
       api = supertest('http://localhost:9001');
      path = require('path');

var filePath = path.join(__dirname, '../../../../APIKEY.txt');

var apiKey = fs.readFileSync(filePath,  {encoding: 'utf-8'});
var apiVersion = 1;
var testPadId = makeid();
var groupID = "";
var authorID = "";

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

/* Tests performed
-> createGroup() -- should return a groupID
 -> listSessionsOfGroup(groupID) -- should be 0
  -> deleteGroup(groupID)
   -> createGroupIfNotExistsFor(groupMapper) -- should return a groupID

    -> createAuthor([name]) -- should return an authorID
     -> createAuthorIfNotExistsFor(authorMapper [, name]) -- should return an authorID
      -> getAuthorName(authorID) -- should return a name IE "john"
       -> listPadsOfAuthor(authorID)

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
     -> isPasswordProtected(padID) -- should be false
      -> setPassword(padID, password)
       -> isPasswordProtected(padID) -- should be true
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
      groupID = res.body.data.groupID
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('createAuthor', function(){
  it('Creates an author with a name set', function(done) {
    api.get(endPoint('createAuthor'))
    .expect(function(res){
      if(res.body.code !== 0 || !res.body.data.authorID) throw new Error("Sessions show as existing for this group");
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
      if(res.body.code !== 0 || !res.body.data === "john") throw new Error("Unable to get Author Name from Author ID");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})


/* Endpoints Still to interact with..
      -> getAuthorName(authorID) -- should return a name IE "john"
       -> listPadsOfAuthor(authorID)

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
     -> isPasswordProtected(padID) -- should be false
      -> setPassword(padID, password)
       -> isPasswordProtected(padID) -- should be true
*/

































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
