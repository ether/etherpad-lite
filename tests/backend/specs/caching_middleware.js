/**
 * caching_middleware is responsible for serving everything under path `/javascripts/`
 * That includes packages as defined in `src/node/utils/tar.json` and probably also plugin code
 *
 */

const common = require('../common');
const settings = require('../../../src/node/utils/Settings');
const assert = require('assert').strict;
const url = require('url');
const queryString = require('querystring');

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
  const query = url.parse(resource).query;
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

/**
 * Adds some seconds to a date object
 */
function addSecondsToDate(date, seconds) {
  date.setSeconds(date.getSeconds() + seconds);
  return date;
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
  const unsupportedMethods = ['post', 'put', 'delete', 'options', 'trace', 'patch'];

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
      await Promise.all(packages.map(async (resource) => await agent.get(resource)
          .set('Accept-Encoding', fantasyEncoding)
          .use(disableAutoDeflate)
          .then((res) => {
            assert.match(res.header['content-type'], /application\/javascript/);
            assert.equal(res.header['content-encoding'], undefined);
            assert.equal(isPlaintextResponse(res.text, resource), true);
          })));
    });
    
    // need to use head here - cant unset Accept-Encoding in GET requests 
    it('head request without Accept-Encoding header does not set Content-Encoding', async function () {
      await agent
          .head(packages[0]) 
          .then((res) => {
            assert.match(res.header['content-type'], /application\/javascript/);
            assert.equal(res.header['content-encoding'], undefined);
          });
    });

    it('gets packages compressed with Accept-Encoding gzip', async function () {
      await Promise.all(packages.map(async (resource) => await agent.get(resource)
          .set('Accept-Encoding', 'gzip')
          .use(disableAutoDeflate)
          .then((res) => {
            assert.match(res.header['content-type'], /application\/javascript/);
            assert.equal(res.header['content-encoding'], 'gzip');
            assert.equal(isPlaintextResponse(res.text, resource), false);
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

    it('only HEAD and GET are supported', async function() {
      await Promise.all(unsupportedMethods.map(async (method) => {
        await agent[method](packages[0])
          .then((res) => {
            assert.equal(res.statusCode, 405)
          })
      }));
    });

    context('expiration', function(){
      it('has date, last-modified and expires header', async function() {
        await Promise.all(packages.map(async (resource) => await agent.get(resource)
            .then((res) => {
              const date = res.header['date'] && new Date(res.header['date']);
              const lastModified = res.header['last-modified'] && new Date(res.header['last-modified']);
              const expires = res.header['expires'] && new Date(res.header['expires']);
              assert.notEqual(date, 'Invalid Date');
              assert.notEqual(lastModified, 'Invalid Date');
              assert.notEqual(expires, 'Invalid Date');
            })));
        });

      it('maxAge is set and limits the expires value', async function() {
        await Promise.all(packages.map(async (resource) => await agent.get(resource)
            .then((res) => {
              const date = res.header['date'] && new Date(res.header['date']);
              const expires = res.header['expires'] && new Date(res.header['expires']);
              const maxAge = res.header['cache-control'];
              assert.equal(maxAge, `max-age=${settings.maxAge}`);
              const expirationDate = addSecondsToDate(date, settings.maxAge);
              assert.ok(Math.abs(expirationDate - expires) <= 1);
            })));
        });

      it('returns 304 with correct if-modified-since header', async function(){
        await Promise.all(packages.map(async (resource) => {
          await agent.get(resource)
            .then(async (res) => {
              const origResult = res.text;
              const lastModified = res.header['last-modified'] && new Date(res.header['last-modified']);
              const futureDate = addSecondsToDate(lastModified, +1000);

              await agent.get(resource)
                  .set('If-Modified-Since', futureDate)
                  .then((res) => {
                    assert.equal(res.statusCode, 304);
                  })

              const pastDate = addSecondsToDate(lastModified, -1100);
              await agent.get(resource)
                  .set('If-Modified-Since', pastDate)
                  .then((res) => {
                    assert.equal(res.statusCode, 200);
                    assert.equal(origResult, res.text);
                  })
            });
        }));
      });
    });
  });

  context('when minify is true', function () {
    before(async function () {
      settings.minify = true;
    });
    it('gets packages uncompressed without Accept-Encoding gzip', async function () {
      await Promise.all(packages.map(async (resource) => await agent.get(resource)
          .set('Accept-Encoding', fantasyEncoding)
          .use(disableAutoDeflate)
          .then((res) => {
            assert.match(res.header['content-type'], /application\/javascript/);
            assert.equal(res.header['content-encoding'], undefined);
            assert.equal(isPlaintextResponse(res.text, resource), true);
          })));
    });

    // need to use head here - cant unset Accept-Encoding in GET requests 
    it('head request without Accept-Encoding header does not set Content-Encoding', async function () {
      await agent
          .head(packages[0]) 
          .then((res) => {
            assert.match(res.header['content-type'], /application\/javascript/);
            assert.equal(res.header['content-encoding'], undefined);
          });
    });

    it('gets packages compressed with Accept-Encoding gzip', async function () {
      await Promise.all(packages.map(async (resource) => await agent.get(resource)
          .set('Accept-Encoding', 'gzip')
          .use(disableAutoDeflate)
          .then((res) => {
            assert.match(res.header['content-type'], /application\/javascript/);
            assert.equal(res.header['content-encoding'], 'gzip');
            assert.equal(isPlaintextResponse(res.text, resource), false);
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

    it('only HEAD and GET are supported', async function() {
      await Promise.all(unsupportedMethods.map(async (method) => {
        await agent[method](packages[0])
          .then((res) => {
            assert.equal(res.statusCode, 405)
          })
      }));
    });

    context('expiration', function(){
      it('has date, last-modified and expires header', async function() {
        await Promise.all(packages.map(async (resource) => await agent.get(resource)
            .then((res) => {
              const date = res.header['date'] && new Date(res.header['date']);
              const lastModified = res.header['last-modified'] && new Date(res.header['last-modified']);
              const expires = res.header['expires'] && new Date(res.header['expires']);
              assert.notEqual(date, 'Invalid Date');
              assert.notEqual(lastModified, 'Invalid Date');
              assert.notEqual(expires, 'Invalid Date');
            })));
        });

      it('maxAge is set and limits the expires value', async function() {
        await Promise.all(packages.map(async (resource) => await agent.get(resource)
            .then((res) => {
              const date = res.header['date'] && new Date(res.header['date']);
              const expires = res.header['expires'] && new Date(res.header['expires']);
              const maxAge = res.header['cache-control'];
              assert.equal(maxAge, `max-age=${settings.maxAge}`);
              const expirationDate = addSecondsToDate(date, settings.maxAge);
              assert.ok(Math.abs(expirationDate - expires) <= 1);
            })));
        });

      it('returns 304 with correct if-modified-since header', async function(){
        await Promise.all(packages.map(async (resource) => {
          await agent.get(resource)
            .then(async (res) => {
              const origResult = res.text;
              const lastModified = res.header['last-modified'] && new Date(res.header['last-modified']);
              const futureDate = addSecondsToDate(lastModified, +1000);

              await agent.get(resource)
                  .set('If-Modified-Since', futureDate)
                  .then((res) => {
                    assert.equal(res.statusCode, 304);
                  })

              const pastDate = addSecondsToDate(lastModified, -1100);
              await agent.get(resource)
                  .set('If-Modified-Since', pastDate)
                  .then((res) => {
                    assert.equal(res.statusCode, 200);
                    assert.equal(origResult, res.text);
                  })
            });
        }));
      });
    });
  });
});
