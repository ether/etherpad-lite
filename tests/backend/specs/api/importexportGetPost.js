/*
 * Import and Export tests for the /p/whateverPadId/import and /p/whateverPadId/export endpoints.
 * Executed using request.  Designed to find flaws and bugs
 */

// import wont work due to sessions missing
// Waiting on https://github.com/ether/etherpad-lite/pull/4012/files to be merged to be fully functional
// Logic for creating sessions is the sessionandGroups.js test spec

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
const wordDoc = fs.readFileSync("../tests/backend/specs/api/test.doc");
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
      console.log("not anyone can import so not testing -- to include this test set allowAnyoneToImport to true in settings.json");
    }else{
      api.get(endPoint('createPad')+"&padID="+testPadId)
      .expect(function(res){
        if(res.body.code !== 0) throw new Error("Unable to create new Pad");

        var req = request.post(host + '/p/'+testPadId+'/import', function (err, res, body) {
         if (err) {
            throw new Error("Failed to import", err);
          } else {
            api.get(endPoint('getText')+"&padID="+testPadId)
            .expect(function(res){
              if(res.body.data.text !== padText.toString()){
                throw new Error("text is wrong on export");
              }
            })
          }
        });

        let form = req.form();

        form.append('file', padText, {
          filename: '/test.txt',
          contentType: 'text/plain'
        });

      })
      .expect('Content-Type', /json/)
      .expect(200, done)
    }
  });

  it('exports DOC', function(done) {
    request(host + '/p/'+testPadId+'/export/doc', function (err, res, body) {
      // expect length to be > 9000
      // TODO: At some point checking that the contents is correct would be suitable
      if(body.length >= 9000){
        done();
      }else{
        throw new Error("Word Document export length is not right");
      }
    })
  })

  it('exports PDF', function(done) {
    request(host + '/p/'+testPadId+'/export/pdf', function (err, res, body) {
      // TODO: At some point checking that the contents is correct would be suitable
      if(body.length >= 1000){
        done();
      }else{
        throw new Error("PDF Document export length is not right");
      }
    })
  })

  it('exports ODT', function(done) {
    request(host + '/p/'+testPadId+'/export/odt', function (err, res, body) {
      // TODO: At some point checking that the contents is correct would be suitable
      if(body.length >= 7000){
        done();
      }else{
        throw new Error("ODT Document export length is not right");
      }
    })
  })

/*
  it('tries to import to a pad that does not exist', function(done) {
    var req = request.post(host + '/p/'+testPadId+testPadId+testPadId+'/import', function (err, res, body) {
      if (res.statusCode === 200) {
        throw new Error("Was able to import to a pad that doesn't exist");
      }else{
          // Wasn't able to write to a pad that doesn't exist, this is expected behavior
          api.get(endPoint('getText')+"&padID="+testPadId+testPadId+testPadId)
          .expect(function(res){
            if(res.body.code !== 1) throw new Error("Pad Exists");
          })
          .expect(200, done)
      }

      let form = req.form();

      form.append('file', padText, {
        filename: '/test.txt',
        contentType: 'text/plain'
      });
    })
  });
*/
/*
  if((settings.abiword && settings.abiword.indexOf("/" === -1)) && (settings.office && settings.soffice.indexOf("/" === -1))){
    console.log("Did not test abiword or soffice");
  }else{
    it('Tries to import file type that uses soffice or abiword', function(done) {
      console.log("DEBUG TODO JOHN CAKE TO REMOVE soffice path", settings.soffice);
      var req = request.post(host + '/p/'+testPadId+'/import', function (err, res, body) {
        if (err) {
          throw new Error("Failed to import", err);
        } else {
          console.warn("response", res.body, testPadId);
          if(res.body.indexOf("FrameCall('undefined', 'ok');") === -1){
            throw new Error("Failed Doc import", testPadId);
          }

          request(host + '/p/'+testPadId+'/export/doc', function (errE, resE, bodyE) {
console.warn(bodyE);
            if(resE.body.indexOf("Hello World") === -1) throw new Error("Could not find Hello World in exported contents", bodyE);

            api.get(endPoint('getText')+"&padID="+testPadId)
            .expect(function(res){
              if(res.body.code !== 0) throw new Error("Could not get pad");
              // Not graceflu but it works
              console.warn("HERE");
            })
            .expect(200, done);

          });
        }
      });

      let form = req.form();

      form.append('file', wordDoc, {
        filename: '/test.doc',
        contentType: 'application/msword'
      });

    })
  }
*/
/*
  it('Tries to import unsupported file type', function(done) {
    if(settings.allowUnknownFileEnds === true){
      console.log("allowing unknown file ends so skipping this test");
      return done();
    }

    var req = request.post(host + '/p/'+testPadId+'/import', function (err, res, body) {
      if (err) {
        throw new Error("Failed to import", err);
      } else {
        if(res.body.indexOf("FrameCall('undefined', 'ok');") !== -1){
          console.log("worked");
          throw new Error("You shouldn't be able to import this file", testPadId);
        }
        return done();
      }
    });

    let form = req.form();
    form.append('file', padText, {
      filename: '/test.xasdasdxx',
      contentType: 'weirdness/jobby'
    });
  });

*/

// end of tests
})





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
