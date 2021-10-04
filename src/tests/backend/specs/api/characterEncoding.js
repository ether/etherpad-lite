'use strict';

/*
 * This file is copied & modified from <basedir>/src/tests/backend/specs/api/pad.js
 *
 * TODO: maybe unify those two files and merge in a single one.
 */

const assert = require('assert').strict;
const common = require('../../common');
const fs = require('fs');
const fsp = fs.promises;

let agent;
const apiKey = common.apiKey;
let apiVersion = 1;
const testPadId = makeid();

const endPoint = (point, version) => `/api/${version || apiVersion}/${point}?apikey=${apiKey}`;

describe(__filename, function () {
  before(async function () { agent = await common.init(); });

  describe('Sanity checks', function () {
    it('can connect', async function () {
      await agent.get('/api/')
          .expect(200)
          .expect('Content-Type', /json/);
    });

    it('finds the version tag', async function () {
      const res = await agent.get('/api/')
          .expect(200);
      apiVersion = res.body.currentVersion;
      assert(apiVersion);
    });

    it('errors with invalid APIKey', async function () {
      // This is broken because Etherpad doesn't handle HTTP codes properly see #2343
      // If your APIKey is password you deserve to fail all tests anyway
      await agent.get(`/api/${apiVersion}/createPad?apikey=password&padID=test`)
          .expect(401);
    });
  });

  describe('Tests', function () {
    it('creates a new Pad', async function () {
      const res = await agent.get(`${endPoint('createPad')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it('Sets the HTML of a Pad attempting to weird utf8 encoded content', async function () {
      const res = await agent.post(endPoint('setHTML'))
          .send({
            padID: testPadId,
            html: await fsp.readFile('tests/backend/specs/api/emojis.html', 'utf8'),
          })
          .expect(200)
          .expect('Content-Type', /json/);
      assert.equal(res.body.code, 0);
    });

    it('get the HTML of Pad with emojis', async function () {
      const res = await agent.get(`${endPoint('getHTML')}&padID=${testPadId}`)
          .expect(200)
          .expect('Content-Type', /json/);
      assert.match(res.body.data.html, /&#127484/);
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
