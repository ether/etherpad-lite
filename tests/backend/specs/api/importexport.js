/*
 * ACHTUNG: there is a copied & modified version of this file in
 * <basedir>/tests/container/spacs/api/pad.js
 *
 * TODO: unify those two files, and merge in a single one.
 */

const assert = require('assert');
const supertest = require(__dirname+'/../../../../src/node_modules/supertest');
const fs = require('fs');
const settings = require(__dirname+'/../../loadSettings').loadSettings();
const api = supertest('http://'+settings.ip+":"+settings.port);
const path = require('path');
const async = require(__dirname+'/../../../../src/node_modules/async');

var filePath = path.join(__dirname, '../../../../APIKEY.txt');

var apiKey = fs.readFileSync(filePath,  {encoding: 'utf-8'});
apiKey = apiKey.replace(/\n$/, "");
var apiVersion = 1;
var lastEdited = "";

var testImports = {
  "malformed": {
    input: '<html><body><li>wtf</ul></body></html>',
    expected: '<!DOCTYPE HTML><html><body><ul class="bullet"><li>FOO</ul><br></body></html>'
  },
  "whitespaceinlist":{
    input: '<html><body><ul> <li>FOO</li></ul></body></html>',
    expected: '<!DOCTYPE HTML><html><body><ul class="bullet"><li>FOO</ul><br></body></html>'
  }
}

Object.keys(testImports).forEach(function (testName) {
  var testPadId = makeid();
  test = testImports[testName];
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

  describe('setHTML', function(){
    it('Sets the HTML', function(done) {
      api.get(endPoint('setHTML')+"&padID="+testPadId+"&html="+test.input)
      .expect(function(res){
        if(res.body.code !== 0) throw new Error("Error:"+testName)
      })
      .expect('Content-Type', /json/)
      .expect(200, done)
    });
  })

  describe('getHTML', function(){

    it('Gets back the HTML of a Pad', function(done) {
      api.get(endPoint('getHTML')+"&padID="+testPadId)
      .expect(function(res){
        var receivedHtml = res.body.data.html;
        if (receivedHtml !== test.expected) {
          throw new Error(`HTML received from export is not the one we were expecting.
             Test Name:
             ${testName}

             Received:
             ${receivedHtml}

             Expected:
             ${test.expected}

             Which is a different version of the originally imported one:
             ${test.input}`);
        }
      })
      .expect('Content-Type', /json/)
      .expect(200, done)
    });
  })
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

