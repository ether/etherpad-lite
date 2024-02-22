'use strict';

import {MapArrayType} from "../../../node/types/MapType";

/**
 * caching_middleware is responsible for serving everything under path `/javascripts/`
 * That includes packages as defined in `src/node/utils/tar.json` and probably also plugin code
 *
 */

const common = require('../common');
import {strict as assert} from 'assert';
import queryString from 'querystring';
const settings = require('../../../node/utils/Settings');
import {it, describe} from 'mocha'

let agent: any;

/**
 * Hack! Returns true if the resource is not plaintext
 * The file should start with the callback method, so we need the
 * URL.
 *
 * @param {string} fileContent the response body
 * @param {URL} resource resource URI
 * @returns {boolean} if it is plaintext
 */
const isPlaintextResponse = (fileContent: string, resource:string): boolean => {
  // callback=require.define&v=1234
  const query = (new URL(resource, 'http://localhost')).search.slice(1);
  // require.define
  const jsonp = queryString.parse(query).callback;

  // returns true if the first letters in fileContent equal the content of `jsonp`
  return fileContent.substring(0, jsonp!.length) === jsonp;
};


type RequestType = {
  _shouldUnzip: () => boolean;
}

/**
 * A hack to disable `superagent`'s auto unzip functionality
 *
 * @param {Request} request
 */
const disableAutoDeflate = (request: RequestType) => {
  request._shouldUnzip = () => false;
};

describe(__filename, function () {
  const backups:MapArrayType<any> = {};
  const fantasyEncoding = 'brainwaves'; // non-working encoding until https://github.com/visionmedia/superagent/pull/1560 is resolved
  const packages = [
    '/javascripts/lib/ep_etherpad-lite/static/js/ace2_common.js?callback=require.define',
    '/javascripts/lib/ep_etherpad-lite/static/js/ace2_inner.js?callback=require.define',
    '/javascripts/lib/ep_etherpad-lite/static/js/pad.js?callback=require.define',
    '/javascripts/lib/ep_etherpad-lite/static/js/timeslider.js?callback=require.define',
  ];

  before(async function () {
    agent = await common.init();
    backups.settings = {};
    backups.settings.minify = settings.minify;
  });
  after(async function () {
    Object.assign(settings, backups.settings);
  });

  for (const minify of [false, true]) {
    context(`when minify is ${minify}`, function () {
      before(async function () {
        settings.minify = minify;
      });

      describe('gets packages uncompressed without Accept-Encoding gzip', function () {
        for (const resource of packages) {
          it(resource, async function () {
            await agent.get(resource)
                .set('Accept-Encoding', fantasyEncoding)
                .use(disableAutoDeflate)
                .expect(200)
                .expect('Content-Type', /application\/javascript/)
                .expect((res:any) => {
                  assert.equal(res.header['content-encoding'], undefined);
                  assert(isPlaintextResponse(res.text, resource));
                });
          });
        }
      });

      describe('gets packages compressed with Accept-Encoding gzip', function () {
        for (const resource of packages) {
          it(resource, async function () {
            await agent.get(resource)
                .set('Accept-Encoding', 'gzip')
                .use(disableAutoDeflate)
                .expect(200)
                .expect('Content-Type', /application\/javascript/)
                .expect('Content-Encoding', 'gzip')
                .expect((res:any) => {
                  assert(!isPlaintextResponse(res.text, resource));
                });
          });
        }
      });

      it('does not cache content-encoding headers', async function () {
        await agent.get(packages[0])
            .set('Accept-Encoding', fantasyEncoding)
            .expect(200)
            .expect((res:any) => assert.equal(res.header['content-encoding'], undefined));
        await agent.get(packages[0])
            .set('Accept-Encoding', 'gzip')
            .expect(200)
            .expect('Content-Encoding', 'gzip');
        await agent.get(packages[0])
            .set('Accept-Encoding', fantasyEncoding)
            .expect(200)
            .expect((res:any) => assert.equal(res.header['content-encoding'], undefined));
      });
    });
  }
});
