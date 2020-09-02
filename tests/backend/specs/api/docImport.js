/*
 * Import and Export tests for the /p/whateverPadId/import and /p/whateverPadId/export endpoints.
 */

const assert = require('assert');
const supertest = require(__dirname+'/../../../../src/node_modules/supertest');
const fs = require('fs');
const settings = require(__dirname+'/../../../../src/node/utils/Settings');
const host = 'http://127.0.0.1:'+settings.port;
const api = supertest('http://'+settings.ip+":"+settings.port);
const path = require('path');
const async = require(__dirname+'/../../../../src/node_modules/async');
const request = require(__dirname+'/../../../../src/node_modules/request');
const padText = fs.readFileSync("../tests/backend/specs/api/test.txt");
const etherpadDoc = fs.readFileSync("../tests/backend/specs/api/test.etherpad");
const wordDoc = fs.readFileSync("../tests/backend/specs/api/test.doc");
const bioDoc = fs.readFileSync("../tests/backend/specs/api/bio.doc"); // used to test if spaces are mantained
const wordXDoc = fs.readFileSync("../tests/backend/specs/api/test.docx");
const odtDoc = fs.readFileSync("../tests/backend/specs/api/test.odt");
const pdfDoc = fs.readFileSync("../tests/backend/specs/api/test.pdf");
var filePath = path.join(__dirname, '../../../../APIKEY.txt');

var apiKey = fs.readFileSync(filePath,  {encoding: 'utf-8'});
apiKey = apiKey.replace(/\n$/, "");
var apiVersion = 1;
var testPadId = makeid();
var lastEdited = "";
var text = generateLongText();

describe('Connectivity', function(){
  it('can connect', function(done) {
    api.get('/api/')
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

describe('API Versioning', function(){
  it('finds the version tag', function(done) {
    api.get('/api/')
    .expect(function(res){
      apiVersion = res.body.currentVersion;
      if (!res.body.currentVersion) throw new Error("No version set in API");
      return;
    })
    .expect(200, done)
  });
})

/*
Tests
-----

Test.
  / Create a pad
  / Set pad contents
  / Try export pad in various formats
  / Get pad contents and ensure it matches imported contents

Test.
  / Try to export a pad that doesn't exist // Expect failure

Test.
  / Try to import an unsupported file to a pad that exists

-- TODO: Test.
  Try to import to a file and abort it half way through

Test.
  Try to import to files of varying size.

Example Curl command for testing import URI:
  curl -s -v --form file=@/home/jose/test.txt http://127.0.0.1:9001/p/foo/import
*/

describe('Imports and Exports', function(){
  it('creates a new Pad, imports content to it, checks that content', function(done) {
    if(!settings.allowAnyoneToImport){
      console.warn("not anyone can import so not testing -- to include this test set allowAnyoneToImport to true in settings.json");
      done();
    }else{
      api.get(endPoint('createPad')+"&padID="+testPadId)
      .expect(function(res){
        if(res.body.code !== 0) throw new Error("Unable to create new Pad");

        var req = request.post(host + '/p/'+testPadId+'/import', function (err, res, body) {
         if (err) {
            throw new Error("Failed to import", err);
          }
        });

        let form = req.form();
        form.append('file', bioDoc, {
          filename: '/bio.doc',
          contentType: 'application/msword'
        });

      })
      .expect('Content-Type', /json/)
      .expect(200, done);

    }
  });
})

describe('getText', function(){
  it('Ensures spaces are respected in .doc imports', function(done) {
    setTimeout(function(){
    api.get(endPoint('getText')+"&padID="+testPadId)
    .expect(function(res){
      if(res.body.data.text.indexOf("RichardC. Hay" !== -1)){
        console.warn(res.body.data.text);
        throw new Error("Error with doc keeping spaces", res.body.data.text);
      }
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
    }, 1000);
  });
});



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
