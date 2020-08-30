
const request = require(__dirname+'/../../../src/node_modules/supertest')

/**
 * types
 * woff
 * WASM
 * html
 * woff2
 * javascript
 *
 * require-js stuff
 *
 * try to require every single file in src/
 */

/**
 * test header
 * test header with garbage
 * if-modified-since
 * last-modfied
 *
 *
 *
 */



// ensure minification is true
describe('Minify', function(done) {
  it('serves fonts', function(done) {
    request('http://localhost:9001')
      .get('/p/MINIFY_TEST_123')
      //.set('Accept', 'application/json')
      //.expect('Content-Type', /json/)
      .expect(200, done);
  });
});
//const assert = require('assert');
//const supertest = require(__dirname+'/../../../../src/node_modules/supertest');
//const fs = require('fs');
//const settings = require(__dirname+'/../../../../src/node/utils/Settings');
//const host = 'http://127.0.0.1:'+settings.port;
//const api = supertest('http://'+settings.ip+":"+settings.port);
//const path = require('path');
//const async = require(__dirname+'/../../../../src/node_modules/async');
//const request = require(__dirname+'/../../../../src/node_modules/request');
//var filePath = path.join(__dirname, '../../../../APIKEY.txt');
//
//var apiKey = fs.readFileSync(filePath,  {encoding: 'utf-8'});
//apiKey = apiKey.replace(/\n$/, "");
//var apiVersion = 1;
//var testPadId = makeid();
//var lastEdited = "";
//var text = generateLongText();
//
//describe('Connectivity', function(){
//  it('can connect', function(done) {
//    api.get('/api/')
//    .expect('Content-Type', /json/)
//    .expect(200, done)
//  });
//})
//
//describe('API Versioning', function(){
//  it('finds the version tag', function(done) {
//    api.get('/api/')
//    .expect(function(res){
//      apiVersion = res.body.currentVersion;
//      if (!res.body.currentVersion) throw new Error("No version set in API");
//      return;
//    })
//    .expect(200, done)
//  });
//})
//
//function makeid()
//{
//  var text = "";
//  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//
//  for( var i=0; i < 5; i++ ){
//    text += possible.charAt(Math.floor(Math.random() * possible.length));
//  }
//  return text;
//}
//
