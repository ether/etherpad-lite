var assert = require('assert')
 supertest = require('supertest'),
        fs = require('fs'),
       api = supertest('http://localhost:9001');
      path = require('path');

var filePath = path.join(__dirname, '../../../APIKEY.txt');

var apiKey = fs.readFileSync(filePath,  {encoding: 'utf-8'});
var apiVersion = 1;
var testPadId = makeid();

describe('Connectivity', function(){
  it('errors if can not connect', function(done) {
    api.get('/api/')
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

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

describe('Permission', function(){
  it('errors if can connect without correct APIKey', function(done) {
    // This is broken because Etherpad doesn't handle HTTP codes properly see #2343
    // If your APIKey is password you deserve to fail all tests anyway
    var permErrorURL = '/api/'+apiVersion+'/createPad?apikey=password&padID=test';
    api.get(permErrorURL)
    .expect(401, done)
  });
})

/* Pad Tests Order of execution
-> deletePad -- This gives us a guaranteed clear environment
 -> createPad
  -> getRevisions(0) -- Should be 0
   -> getHTML -- Should be the default pad text in HTML format
    -> deletePad -- Should just delete a pad
     -> getHTML -- Should return an error
      -> createPad(withText)
       -> getText -- Should have the text specified above as the pad text
        -> setText
         -> getText -- Should be the text set before
          -> getRevisions -- Should be 0 still?
           -> padUsersCount -- Should be 0
            -> getReadOnlyId -- Should be a value
*/

describe('deletePad', function(){
  it('deletes a Pad', function(done) {
    api.get(endPoint('deletePad')+"&padID="+testPadId)
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('createPad', function(){
  it('creates a new Pad', function(done) {
    api.get(endPoint('createPad')+"&padID="+testPadId)
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getRevisions', function(){
  it('gets revision count of Pad', function(done) {
    api.get(endPoint('getRevisions')+"&padID="+testPadId)
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getHTML', function(){
  it('get the HTML of Pad', function(done) {
    api.get(endPoint('getHTML')+"&padID="+testPadId)
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('deletePad', function(){
  it('deletes a Pad', function(done) {
    api.get(endPoint('deletePad')+"&padID="+testPadId)
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getHTML', function(){
  it('get the HTML of a Pad', function(done) {
    api.get(endPoint('getHTML')+"&padID="+testPadId)
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('createPad', function(){
  it('creates a new Pad with text', function(done) {
    api.get(endPoint('createPad')+"&padID="+testPadId+"&test=testText")
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getText', function(){
  it('gets the Pad text', function(done) {
    api.get(endPoint('getText')+"&padID="+testPadId)
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('setText', function(){
  it('creates a new Pad with text', function(done) {
    api.get(endPoint('createPad')+"&padID="+testPadId+"&test=testText")
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getText', function(){
  it('gets the Pad text', function(done) {
    api.get(endPoint('getText')+"&padID="+testPadId)
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getRevisions', function(){
  it('gets Revision Coutn of a Pad', function(done) {
    api.get(endPoint('getRevisions')+"&padID="+testPadId)
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('padUsersCount', function(){
  it('gets Revision Coutn of a Pad', function(done) {
    api.get(endPoint('padUsersCount')+"&padID="+testPadId)
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getReadOnlyId', function(){
  it('Gets the Read Only ID of a Pad', function(done) {
    api.get(endPoint('getReadOnlyId')+"&padID="+testPadId)
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})



/* Endpoints Still to interact with.. 
/ createPad(padID [, text]) 
/ getRevisions(padID) 
/ deletePad(padID) 
/ getReadOnlyID(padID) 
/ getHTML(padID, [rev]) 
/ setText(padID, text) 
/ getText(padID, [rev])

padUsersCount(padID) 
setPublicStatus(padID, publicStatus) 
getPublicStatus(padID) 
setPassword(padID, password) 
isPasswordProtected(padID) 
listAuthorsOfPad(padID) 
getLastEdited(padID) 
listSessionsOfGroup(groupID)
getSessionInfo(sessionID) 
deleteSession(sessionID) 
createSession(groupID, authorID, validUntil) 
listPadsOfAuthor(authorID)
createAuthorIfNotExistsFor(authorMapper [, name]) 
createAuthor([name])
createGroupPad(groupID, padName [, text]) 
listPads(groupID) 
deleteGroup(groupID) 
createGroupIfNotExistsFor(groupMapper)
createGroup() 
*/


/*
describe('getRevisionsCount', function(){
  it('gets the revision counts of a new pad', function(done) {
    // This is broken because Etherpad doesn't handle HTTP codes properly see #2$
    // If your APIKey is password you deserve to fail all tests anyway
    api.get(endPoint('getRevisionsCount')+"&padID="+testPadId) 
    .expect('Content-Type', /json/)
    .expect(function(res){
      console.log(res.body);
    })
    .expect(200, done)
  });
})
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
