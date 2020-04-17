/*
 * Tests for the instance-level APIs
 *
 * Section "GLOBAL FUNCTIONS" in src/node/db/API.js
 */
const assert = require('assert');
const supertest = require(__dirname+'/../../../../src/node_modules/supertest');
const fs = require('fs');
const settings = require(__dirname+'/../../../../src/node/utils/Settings');
const api = supertest('http://'+settings.ip+":"+settings.port);
const path = require('path');

var filePath = path.join(__dirname, '../../../../APIKEY.txt');

var apiKey = fs.readFileSync(filePath,  {encoding: 'utf-8'});
apiKey = apiKey.replace(/\n$/, "");

var apiVersion = '1.2.14';

describe('Connectivity for instance-level API tests', function() {
  it('can connect', function(done) {
    api.get('/api/')
    .expect('Content-Type', /json/)
    .expect(200, done)
  });
});

describe('getStats', function(){
  it('Gets the stats of a running instance', function(done) {
    api.get(endPoint('getStats'))
    .expect(function(res){
      if (res.body.code !== 0) throw new Error("getStats() failed");

      if (!(('totalPads' in res.body.data) && (typeof res.body.data.totalPads === 'number'))) {
        throw new Error(`Response to getStats() does not contain field totalPads, or it's not a number: ${JSON.stringify(res.body.data)}`);
      }

      if (!(('totalSessions' in res.body.data) && (typeof res.body.data.totalSessions === 'number'))) {
        throw new Error(`Response to getStats() does not contain field totalSessions, or it's not a number: ${JSON.stringify(res.body.data)}`);
      }

      if (!(('totalActivePads' in res.body.data) && (typeof res.body.data.totalActivePads === 'number'))) {
        throw new Error(`Response to getStats() does not contain field totalActivePads, or it's not a number: ${JSON.stringify(res.body.data)}`);
      }
    })
    .expect('Content-Type', /json/)
    .expect(200, done);
  });
});

var endPoint = function(point, version){
  version = version || apiVersion;
  return '/api/'+version+'/'+point+'?apikey='+apiKey;
}
