/*
 * ACHTUNG: this file was copied & modified from the analogous
 * <basedir>/tests/backend/specs/api/pad.js
 *
 * TODO: unify those two files, and merge in a single one.
 */

const supertest = require(__dirname+'/../../../../src/node_modules/supertest');
const settings = require(__dirname+'/../../loadSettings').loadSettings();
const api = supertest('http://'+settings.ip+":"+settings.port);

var apiVersion = 1;

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
      if (!res.body.currentVersion) throw new Error("No version set in API");
      return;
    })
    .expect(200, done)
  });
})

describe('Permission', function(){
  it('errors with invalid APIKey', function(done) {
    api.get('/api/'+apiVersion+'/createPad?apikey=wrong_password&padID=test')
    .expect(401, done)
  });
})
