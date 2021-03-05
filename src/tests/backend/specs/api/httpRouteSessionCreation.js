'use strict';

const assert = require('assert').strict;
const common = require('../../common');
const settings = require('../../../../node/utils/Settings');
const shouldNotCreateExpressSession =
    require('../../../../node/hooks/express/webaccess').staticPaths;
const fs = require('fs');
const SessionStore = require('../../../../node/db/SessionStore');
const store = new SessionStore;
let agent;

const shouldCreateExpressSession = [
  '/p/foo',
  '/p/foo/export/html',
  '/socket.io',
  '/ep_example',
  '/admin',
];

describe(__filename, function () {
  before(async function () { agent = await common.init(); });

  describe('Express Session Creation on endpoint', function () {
    if (settings.dbType !== 'dirty') this.skip;

    this.timeout(100);
    for (const endpoint of shouldNotCreateExpressSession) {
      it(endpoint, async function () {
        const previousCount = store.length();
        await agent.get(endpoint)
        .expect(200)
        .expect((res) => {
          const hasExpressSessionCookie =
              res.headers['set-cookie'][0].indexOf('express_sid');
          assert(hasExpressSessionCookie === -1);
          console.error(res);
          const newCount = store.length();
          assert(newCount === previousCount);
        })
      });
    }

    for (let endpoint of shouldCreateExpressSession) {
      // clean up endpoint as it's designed for use in regex
      endpoint = endpoint.split('(')[0];
      endpoint = endpoint.replace('\\', '');
      endpoint = endpoint.replace('.*', '');
      endpoint = endpoint.replace('?', '');
      const previousCount = store.length();
      it(endpoint, async function () {
        await agent.get(endpoint)
        .expect(200)
        .expect((res) => {
          console.error(res.headers['set-cookie']);
          const hasExpressSessionCookie =
              res.headers['set-cookie'][0].indexOf('express_sid');
          assert(hasExpressSessionCookie !== -1);
          const newCount = store.length();
          console.log(newCount);
          assert(newCount > previousCount);
        })
      });
    }

  });
});
