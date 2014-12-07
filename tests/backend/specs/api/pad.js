var assert = require('assert')
 supertest = require(__dirname+'/../../../../src/node_modules/supertest'),
        fs = require('fs'),
       api = supertest('http://localhost:9001');
      path = require('path');

var filePath = path.join(__dirname, '../../../../APIKEY.txt');

var apiKey = fs.readFileSync(filePath,  {encoding: 'utf-8'});
var apiVersion = 1;
var testPadId = makeid();
var lastEdited = "";

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
  -> getRevisions -- Should be 0
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
             -> listAuthorsOfPad(padID) -- should be empty array?
              -> getLastEdited(padID) -- Should be when pad was made
               -> setText(padId)
                -> getLastEdited(padID) -- Should be when setText was performed
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
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Unable to create new Pad");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getRevisionsCount', function(){
  it('gets revision count of Pad', function(done) {
    api.get(endPoint('getRevisionsCount')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Unable to get Revision Count");
      if(res.body.data.revisions !== 0) throw new Error("Incorrect Revision Count");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getHTML', function(){
  it('get the HTML of Pad', function(done) {
    api.get(endPoint('getHTML')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.data.html.length <= 1) throw new Error("Unable to get Revision Count");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('deletePad', function(){
  it('deletes a Pad', function(done) {
    api.get(endPoint('deletePad')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Pad Deletion failed")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getHTML', function(){
  it('get the HTML of a Pad -- Should return a failure', function(done) {
    api.get(endPoint('getHTML')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.code !== 1) throw new Error("Pad deletion failed")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('createPad', function(){
  it('creates a new Pad with text', function(done) {
    api.get(endPoint('createPad')+"&padID="+testPadId+"&text=testText")
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Pad Creation failed")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getText', function(){
  it('gets the Pad text and expect it to be testText with \n which is a line break', function(done) {
    api.get(endPoint('getText')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.data.text !== "testText\n") throw new Error("Pad Creation with text")
    }) 
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('setText', function(){
  it('creates a new Pad with text', function(done) {
    api.get(endPoint('setText')+"&padID="+testPadId+"&text=testTextTwo")
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Pad setting text failed");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getText', function(){
  it('gets the Pad text', function(done) {
    api.get(endPoint('getText')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.data.text !== "testTextTwo\n") throw new Error("Setting Text")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getRevisionsCount', function(){
  it('gets Revision Coutn of a Pad', function(done) {
    api.get(endPoint('getRevisionsCount')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.data.revisions !== 1) throw new Error("Unable to set text revision count")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('padUsersCount', function(){
  it('gets User Count of a Pad', function(done) {
    api.get(endPoint('padUsersCount')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.data.padUsersCount !== 0) throw new Error("Incorrect Pad User count")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getReadOnlyID', function(){
  it('Gets the Read Only ID of a Pad', function(done) {
    api.get(endPoint('getReadOnlyID')+"&padID="+testPadId)
    .expect(function(res){
      if(!res.body.data.readOnlyID) throw new Error("No Read Only ID for Pad")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('listAuthorsOfPad', function(){
  it('Get Authors of the Pad', function(done) {
    api.get(endPoint('listAuthorsOfPad')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.data.authorIDs.length !== 0) throw new Error("# of Authors of pad is not 0")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getLastEdited', function(){
  it('Get When Pad was left Edited', function(done) {
    api.get(endPoint('getLastEdited')+"&padID="+testPadId)
    .expect(function(res){
      if(!res.body.data.lastEdited){
        throw new Error("# of Authors of pad is not 0")
      }else{
        lastEdited = res.body.data.lastEdited;
      }
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('setText', function(){
  it('creates a new Pad with text', function(done) {
    api.get(endPoint('setText')+"&padID="+testPadId+"&text=testTextTwo")
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Pad setting text failed");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getLastEdited', function(){
  it('Get When Pad was left Edited', function(done) {
    api.get(endPoint('getLastEdited')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.data.lastEdited <= lastEdited){
        throw new Error("Editing A Pad is not updating when it was last edited")
      }
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
