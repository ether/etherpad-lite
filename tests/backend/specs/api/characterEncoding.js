/*
 * This file is copied & modified from <basedir>/tests/backend/specs/api/pad.js
 *
 * TODO: maybe unify those two files and merge in a single one.
 */

const assert = require('assert');
const supertest = require(__dirname+'/../../../../src/node_modules/supertest');
const fs = require('fs');
const settings = require(__dirname + '/../../../../src/node/utils/Settings');
const api = supertest('http://'+settings.ip+":"+settings.port);
const path = require('path');
const async = require(__dirname+'/../../../../src/node_modules/async');

var filePath = path.join(__dirname, '../../../../APIKEY.txt');

var apiKey = fs.readFileSync(filePath,  {encoding: 'utf-8'});
apiKey = apiKey.replace(/\n$/, "");
var apiVersion = 1;
var testPadId = makeid();

describe('Connectivity For Character Encoding', function(){
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

describe('Permission', function(){
  it('errors with invalid APIKey', function(done) {
    // This is broken because Etherpad doesn't handle HTTP codes properly see #2343
    // If your APIKey is password you deserve to fail all tests anyway
    var permErrorURL = '/api/'+apiVersion+'/createPad?apikey=password&padID=test';
    api.get(permErrorURL)
    .expect(401, done)
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

describe('setHTML', function(){
  it('Sets the HTML of a Pad attempting to weird utf8 encoded content', function(done) {
    fs.readFile('../tests/backend/specs/api/emojis.html', 'utf8', function(err, html) {
    api.post(endPoint('setHTML'))
      .send({
        "padID": testPadId,
        "html":  html,
      })
      .expect(function(res){
        if(res.body.code !== 0) throw new Error("Can't set HTML properly");
      })
      .expect('Content-Type', /json/)
      .expect(200, done);
    });
  });
})

describe('getHTML', function(){
  it('get the HTML of Pad with emojis', function(done) {
    api.get(endPoint('getHTML')+"&padID="+testPadId)
    .expect(function(res){
      if (res.body.data.html.indexOf("&#127484") === -1) {
        throw new Error("Unable to get the HTML");
      }
    })
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
})

/*

  End of test

*/

var endPoint = function(point, version){
  version = version || apiVersion;
  return '/api/'+version+'/'+point+'?apikey='+apiKey;
}

function makeid()
{
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for( var i=0; i < 10; i++ ){
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
