'use strict';

/*
 * This file is copied & modified from <basedir>/src/tests/backend/specs/api/pad.js
 *
 * TODO: maybe unify those two files and merge in a single one.
 */

const common = require('../../common');
const fs = require('fs');

let agent;
const apiKey = common.apiKey;
let apiVersion = 1;
const testPadId = makeid();

const endPoint = (point, version) => `/api/${version || apiVersion}/${point}?apikey=${apiKey}`;

describe(__filename, function () {
  before(async function () { agent = await common.init(); });

  describe('Connectivity For Character Encoding', function () {
    it('can connect', function (done) {
      this.timeout(250);
      agent.get('/api/')
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('API Versioning', function () {
    this.timeout(150);
    it('finds the version tag', function (done) {
      agent.get('/api/')
          .expect((res) => {
            apiVersion = res.body.currentVersion;
            if (!res.body.currentVersion) throw new Error('No version set in API');
            return;
          })
          .expect(200, done);
    });
  });

  describe('Permission', function () {
    it('errors with invalid APIKey', function (done) {
      this.timeout(150);
      // This is broken because Etherpad doesn't handle HTTP codes properly see #2343
      // If your APIKey is password you deserve to fail all tests anyway
      const permErrorURL = `/api/${apiVersion}/createPad?apikey=password&padID=test`;
      agent.get(permErrorURL)
          .expect(401, done);
    });
  });

  describe('createPad', function () {
    it('creates a new Pad', function (done) {
      this.timeout(150);
      agent.get(`${endPoint('createPad')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('Unable to create new Pad');
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('setHTML', function () {
    it('Sets the HTML of a Pad attempting to weird utf8 encoded content', function (done) {
      this.timeout(1000);
      fs.readFile('tests/backend/specs/api/emojis.html', 'utf8', (err, html) => {
        agent.post(endPoint('setHTML'))
            .send({
              padID: testPadId,
              html,
            })
            .expect((res) => {
              if (res.body.code !== 0) throw new Error("Can't set HTML properly");
            })
            .expect('Content-Type', /json/)
            .expect(200, done);
      });
    });
  });

  describe('getHTML', function () {
    it('get the HTML of Pad with emojis', function (done) {
      this.timeout(400);
      agent.get(`${endPoint('getHTML')}&padID=${testPadId}`)
          .expect((res) => {
            if (res.body.data.html.indexOf('&#127484') === -1) {
              throw new Error('Unable to get the HTML');
            }
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });
});

/*

  End of test

*/

function makeid() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 10; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
