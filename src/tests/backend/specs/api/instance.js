'use strict';

/*
 * Tests for the instance-level APIs
 *
 * Section "GLOBAL FUNCTIONS" in src/node/db/API.js
 */
const common = require('../../common');

let agent;
const apiKey = common.apiKey;
const apiVersion = '1.2.14';

const endPoint = (point, version) => `/api/${version || apiVersion}/${point}?apikey=${apiKey}`;

describe(__filename, function () {
  before(async function () { agent = await common.init(); });

  describe('Connectivity for instance-level API tests', function () {
    it('can connect', function (done) {
      agent.get('/api/')
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });

  describe('getStats', function () {
    it('Gets the stats of a running instance', function (done) {
      agent.get(endPoint('getStats'))
          .expect((res) => {
            if (res.body.code !== 0) throw new Error('getStats() failed');

            if (!('totalPads' in res.body.data && typeof res.body.data.totalPads === 'number')) {
              throw new Error('Response to getStats() does not contain field totalPads, or ' +
                              `it's not a number: ${JSON.stringify(res.body.data)}`);
            }

            if (!('totalSessions' in res.body.data &&
                  typeof res.body.data.totalSessions === 'number')) {
              throw new Error('Response to getStats() does not contain field totalSessions, or ' +
                              `it's not a number: ${JSON.stringify(res.body.data)}`);
            }

            if (!('totalActivePads' in res.body.data &&
                  typeof res.body.data.totalActivePads === 'number')) {
              throw new Error('Response to getStats() does not contain field totalActivePads, or ' +
                              `it's not a number: ${JSON.stringify(res.body.data)}`);
            }
          })
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });
});
