'use strict';

/**
 * caching_middleware is responsible for serving everything under path `/javascripts/`
 * That includes packages as defined in `src/node/utils/tar.json` and probably also plugin code
 *
 */

const common = require('../common');
const assert = require('../assert-legacy').strict;
const queryString = require('querystring');
const settings = require('../../../node/utils/Settings');

let agent;

/**
 * Hack! Returns true if the resource is not plaintext
 * The file should start with the callback method, so we need the
 * URL.
 *
 * @param {string} fileContent the response body
 * @param {URI} resource resource URI
 * @returns {boolean} if it is plaintext
 */
function isPlaintextResponse(fileContent, resource) {
  // callback=require.define&v=1234
  const query = (new URL(resource, 'http://localhost')).search.slice(1);
  // require.define
  const jsonp = queryString.parse(query).callback;

  // returns true if the first letters in fileContent equal the content of `jsonp`
  return fileContent.substring(0, jsonp.length) === jsonp;
}

/**
 * A hack to disable `superagent`'s auto unzip functionality
 *
 * @param {Request} request
 */
function disableAutoDeflate(request) {
  request._shouldUnzip = function () {
    return false;
  };
}

describe(__filename, function () {
  const backups = {};
  const fantasyEncoding = 'brainwaves'; // non-working encoding until https://github.com/visionmedia/superagent/pull/1560 is resolved
  const packages = [
    '/javascripts/lib/ep_etherpad-lite/static/js/ace2_common.js?callback=require.define',
    '/javascripts/lib/ep_etherpad-lite/static/js/ace2_inner.js?callback=require.define',
    '/javascripts/lib/ep_etherpad-lite/static/js/pad.js?callback=require.define',
    '/javascripts/lib/ep_etherpad-lite/static/js/timeslider.js?callback=require.define',
  ];

  before(async function () {
    agent = await common.init();
  });
  beforeEach(async function () {
    backups.settings = {};
    backups.settings.minify = settings.minify;
  });
  afterEach(async function () {
    Object.assign(settings, backups.settings);
  });

  context('when minify is false', function () {
    before(async function () {
      settings.minify = false;
    });
    it('gets packages uncompressed without Accept-Encoding gzip', async function () {
      await Promise.all(packages.map(async (resource) => agent.get(resource)
          .set('Accept-Encoding', fantasyEncoding)
          .use(disableAutoDeflate)
          .then((res) => {
            assert.match(res.header['content-type'], /application\/javascript/);
            assert.equal(res.header['content-encoding'], undefined);
            assert.equal(isPlaintextResponse(res.text, resource), true);
            return;
          })));
    });

    it('gets packages compressed with Accept-Encoding gzip', async function () {
      await Promise.all(packages.map(async (resource) => agent.get(resource)
          .set('Accept-Encoding', 'gzip')
          .use(disableAutoDeflate)
          .then((res) => {
            assert.match(res.header['content-type'], /application\/javascript/);
            assert.equal(res.header['content-encoding'], 'gzip');
            assert.equal(isPlaintextResponse(res.text, resource), false);
            return;
          })));
    });

    it('does not cache content-encoding headers', async function () {
      await agent.get(packages[0])
          .set('Accept-Encoding', fantasyEncoding)
          .then((res) => assert.equal(res.header['content-encoding'], undefined));
      await agent.get(packages[0])
          .set('Accept-Encoding', 'gzip')
          .then((res) => assert.equal(res.header['content-encoding'], 'gzip'));
      await agent.get(packages[0])
          .set('Accept-Encoding', fantasyEncoding)
          .then((res) => assert.equal(res.header['content-encoding'], undefined));
    });
  });

  context('when minify is true', function () {
    before(async function () {
      settings.minify = true;
    });
    it('gets packages uncompressed without Accept-Encoding gzip', async function () {
      await Promise.all(packages.map(async (resource) => agent.get(resource)
          .set('Accept-Encoding', fantasyEncoding)
          .use(disableAutoDeflate)
          .then((res) => {
            assert.match(res.header['content-type'], /application\/javascript/);
            assert.equal(res.header['content-encoding'], undefined);
            assert.equal(isPlaintextResponse(res.text, resource), true);
            return;
          })));
    });

    it('gets packages compressed with Accept-Encoding gzip', async function () {
      await Promise.all(packages.map(async (resource) => agent.get(resource)
          .set('Accept-Encoding', 'gzip')
          .use(disableAutoDeflate)
          .then((res) => {
            assert.match(res.header['content-type'], /application\/javascript/);
            assert.equal(res.header['content-encoding'], 'gzip');
            assert.equal(isPlaintextResponse(res.text, resource), false);
            return;
          })));
    });

    it('does not cache content-encoding headers', async function () {
      await agent.get(packages[0])
          .set('Accept-Encoding', fantasyEncoding)
          .then((res) => assert.equal(res.header['content-encoding'], undefined));
      await agent.get(packages[0])
          .set('Accept-Encoding', 'gzip')
          .then((res) => assert.equal(res.header['content-encoding'], 'gzip'));
      await agent.get(packages[0])
          .set('Accept-Encoding', fantasyEncoding)
          .then((res) => assert.equal(res.header['content-encoding'], undefined));
    });
  });
});
