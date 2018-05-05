var assert = require('assert')
 supertest = require(__dirname+'/../../../../src/node_modules/supertest'),
        fs = require('fs'),
  settings = require(__dirname+'/../../loadSettings').loadSettings(),
       api = supertest('http://'+settings.ip+":"+settings.port),
      path = require('path'),
     async = require(__dirname+'/../../../../src/node_modules/async');

var filePath = path.join(__dirname, '../../../../APIKEY.txt');

var apiKey = fs.readFileSync(filePath,  {encoding: 'utf-8'});
apiKey = apiKey.replace(/\n$/, "");
var apiVersion = 1;
var testPadId = makeid();
var lastEdited = "";
var text = generateLongText();
var ULhtml = '<!DOCTYPE html><html><body><ul class="bullet"><li>one</li><li>2</li></ul><br><ul><ul class="bullet"><li>UL2</li></ul></ul></body></html>';

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
   -> getSavedRevisionsCount(padID) -- Should be 0
    -> listSavedRevisions(padID) -- Should be an empty array
     -> getHTML -- Should be the default pad text in HTML format
      -> deletePad -- Should just delete a pad
       -> getHTML -- Should return an error
        -> createPad(withText)
         -> getText -- Should have the text specified above as the pad text
          -> setText
           -> getText -- Should be the text set before
            -> getRevisions -- Should be 0 still?
             -> saveRevision
              -> getSavedRevisionsCount(padID) -- Should be 0 still?
               -> listSavedRevisions(padID) -- Should be an empty array still ?
                -> padUsersCount -- Should be 0
                 -> getReadOnlyId -- Should be a value
                  -> listAuthorsOfPad(padID) -- should be empty array?
                   -> getLastEdited(padID) -- Should be when pad was made
                    -> setText(padId)
                     -> getLastEdited(padID) -- Should be when setText was performed
                      -> padUsers(padID) -- Should be when setText was performed

                       -> setText(padId, "hello world")
                        -> getLastEdited(padID) -- Should be when pad was made
                         -> getText(padId) -- Should be "hello world"
                          -> movePad(padID, newPadId) -- Should provide consistant pad data
                           -> getText(newPadId) -- Should be "hello world"
                            -> movePad(newPadID, originalPadId) -- Should provide consistant pad data
                             -> getText(originalPadId) -- Should be "hello world"
                              -> getLastEdited(padID) -- Should not be 0
                              -> appendText(padID, "hello")
                              -> getText(padID) -- Should be "hello worldhello"
                               -> setHTML(padID) -- Should fail on invalid HTML
                                -> setHTML(padID) *3 -- Should fail on invalid HTML
                                 -> getHTML(padID) -- Should return HTML close to posted HTML
                                  -> createPad -- Tries to create pads with bad url characters

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

describe('getSavedRevisionsCount', function(){
  it('gets saved revisions count of Pad', function(done) {
    api.get(endPoint('getSavedRevisionsCount')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Unable to get Saved Revisions Count");
      if(res.body.data.savedRevisions !== 0) throw new Error("Incorrect Saved Revisions Count");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('listSavedRevisions', function(){
  it('gets saved revision list of Pad', function(done) {
    api.get(endPoint('listSavedRevisions')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Unable to get Saved Revisions List");
      if(!res.body.data.savedRevisions.equals([])) throw new Error("Incorrect Saved Revisions List");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getHTML', function(){
  it('get the HTML of Pad', function(done) {
    api.get(endPoint('getHTML')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.data.html.length <= 1) throw new Error("Unable to get the HTML");
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
  it('gets Revision Count of a Pad', function(done) {
    api.get(endPoint('getRevisionsCount')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.data.revisions !== 1) throw new Error("Unable to get text revision count")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('saveRevision', function(){
  it('saves Revision', function(done) {
    api.get(endPoint('saveRevision')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Unable to save Revision");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getSavedRevisionsCount', function(){
  it('gets saved revisions count of Pad', function(done) {
    api.get(endPoint('getSavedRevisionsCount')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Unable to get Saved Revisions Count");
      if(res.body.data.savedRevisions !== 1) throw new Error("Incorrect Saved Revisions Count");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('listSavedRevisions', function(){
  it('gets saved revision list of Pad', function(done) {
    api.get(endPoint('listSavedRevisions')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Unable to get Saved Revisions List");
      if(!res.body.data.savedRevisions.equals([1])) throw new Error("Incorrect Saved Revisions List");
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

describe('padUsers', function(){
  it('gets User Count of a Pad', function(done) {
    api.get(endPoint('padUsers')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.data.padUsers.length !== 0) throw new Error("Incorrect Pad Users")
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

var originalPadId = testPadId;
var newPadId = makeid();

describe('createPad', function(){
  it('creates a new Pad with text', function(done) {
    api.get(endPoint('createPad')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Pad Creation failed")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('setText', function(){
  it('Sets text on a pad Id', function(done) {
    api.get(endPoint('setText')+"&padID="+testPadId+"&text="+text)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Pad Set Text failed")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getText', function(){
  it('Gets text on a pad Id', function(done) {
    api.get(endPoint('getText')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Pad Get Text failed")
      if(res.body.data.text !== text+"\n") throw new Error("Pad Text not set properly");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('setText', function(){
  it('Sets text on a pad Id including an explicit newline', function(done) {
    api.get(endPoint('setText')+"&padID="+testPadId+"&text="+text+'%0A')
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Pad Set Text failed")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getText', function(){
  it("Gets text on a pad Id and doesn't have an excess newline", function(done) {
    api.get(endPoint('getText')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Pad Get Text failed")
      if(res.body.data.text !== text+"\n") throw new Error("Pad Text not set properly");
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getLastEdited', function(){
  it('Gets when pad was last edited', function(done) {
    api.get(endPoint('getLastEdited')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.lastEdited === 0) throw new Error("Get Last Edited Failed")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('movePad', function(){
  it('Move a Pad to a different Pad ID', function(done) {
    api.get(endPoint('movePad')+"&sourceID="+testPadId+"&destinationID="+newPadId+"&force=true")
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Moving Pad Failed")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getText', function(){
  it('Gets text on a pad Id', function(done) {
    api.get(endPoint('getText')+"&padID="+newPadId)
    .expect(function(res){
      if(res.body.data.text !== text+"\n") throw new Error("Pad Get Text failed")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('movePad', function(){
  it('Move a Pad to a different Pad ID', function(done) {
    api.get(endPoint('movePad')+"&sourceID="+newPadId+"&destinationID="+testPadId+"&force=false")
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Moving Pad Failed")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getText', function(){
  it('Gets text on a pad Id', function(done) {
    api.get(endPoint('getText')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.data.text !== text+"\n") throw new Error("Pad Get Text failed")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getLastEdited', function(){
  it('Gets when pad was last edited', function(done) {
    api.get(endPoint('getLastEdited')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.lastEdited === 0) throw new Error("Get Last Edited Failed")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('appendText', function(){
  it('Append text to a pad Id', function(done) {
    api.get(endPoint('appendText', '1.2.13')+"&padID="+testPadId+"&text=hello")
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Pad Append Text failed");
    })
    .expect('Content-Type', /json/)
    .expect(200, done);
  });
});

describe('getText', function(){
  it('Gets text on a pad Id', function(done) {
    api.get(endPoint('getText')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("Pad Get Text failed");
      if(res.body.data.text !== text+"hello\n") throw new Error("Pad Text not set properly");
    })
    .expect('Content-Type', /json/)
    .expect(200, done);
  });
});


describe('setHTML', function(){
  it('Sets the HTML of a Pad attempting to pass ugly HTML', function(done) {
    var html = "<div><b>Hello HTML</title></head></div>";
    api.get(endPoint('setHTML')+"&padID="+testPadId+"&html="+html)
    .expect(function(res){
      if(res.body.code !== 1) throw new Error("Allowing crappy HTML to be imported")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('setHTML', function(){
  it('Sets the HTML of a Pad with a bunch of weird unordered lists inserted', function(done) {
    api.get(endPoint('setHTML')+"&padID="+testPadId+"&html="+ULhtml)
    .expect(function(res){
      if(res.body.code !== 0) throw new Error("List HTML cant be imported")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('getHTML', function(){
  it('Gets the HTML of a Pad with a bunch of weird unordered lists inserted', function(done) {
    api.get(endPoint('getHTML')+"&padID="+testPadId)
    .expect(function(res){
      var ehtml = res.body.data.html.replace("<br></body>", "</body>").toLowerCase();
      var uhtml = ULhtml.toLowerCase();
      if(ehtml !== uhtml) throw new Error("Imported HTML does not match served HTML")
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('createPad', function(){
  it('errors if pad can be created', function(done) {
    var badUrlChars = ["/", "%23", "%3F", "%26"];
    async.map(
      badUrlChars, 
      function (badUrlChar, cb) {
        api.get(endPoint('createPad')+"&padID="+badUrlChar)
        .expect(function(res){
          if(res.body.code !== 1) throw new Error("Pad with bad characters was created");
        })
        .expect('Content-Type', /json/)
        .end(cb);
      },
      done);
  });
})


/*
                          -> movePadForce Test

*/

var endPoint = function(point, version){
  version = version || apiVersion;
  return '/api/'+version+'/'+point+'?apikey='+apiKey;
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

function generateLongText(){
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for( var i=0; i < 80000; i++ ){
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Need this to compare arrays (listSavedRevisions test)
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;
    // compare lengths - can save a lot of time
    if (this.length != array.length)
        return false;
    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;
        } else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
}
