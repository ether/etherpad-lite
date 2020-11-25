/**
 * API specs
 *
 * Tests for generic overarching HTTP API related features not related to any
 * specific part of the data model or domain. For example: tests for versioning
 * and openapi definitions.
 */

const common = require('../../common');
const supertest = require(`${__dirname}/../../../../src/node_modules/supertest`);
const settings = require(`${__dirname}/../../../../src/node/utils/Settings`);
const api = supertest(`http://${settings.ip}:${settings.port}`);

const validateOpenAPI = require(`${__dirname}/../../../../src/node_modules/openapi-schema-validation`).validate;

const apiKey = common.apiKey;
let apiVersion = 1;

const testPadId = makeid();

describe(__filename, function () {
  describe('API Versioning', function () {
    it('errors if can not connect', function (done) {
      api
          .get('/api/')
          .expect((res) => {
            apiVersion = res.body.currentVersion;
            if (!res.body.currentVersion) throw new Error('No version set in API');
            return;
          })
          .expect(200, done);
    });
  });

  describe('OpenAPI definition', function () {
    it('generates valid openapi definition document', function (done) {
      api
          .get('/api/openapi.json')
          .expect((res) => {
            const {valid, errors} = validateOpenAPI(res.body, 3);
            if (!valid) {
              const prettyErrors = JSON.stringify(errors, null, 2);
              throw new Error(`Document is not valid OpenAPI. ${errors.length} validation errors:\n${prettyErrors}`);
            }
            return;
          })
          .expect(200, done);
    });
  });

  describe('jsonp support', function () {
    it('supports jsonp calls', function (done) {
      api
          .get(`${endPoint('createPad')}&jsonp=jsonp_1&padID=${testPadId}`)
          .expect((res) => {
            if (!res.text.match('jsonp_1')) throw new Error('no jsonp call seen');
          })
          .expect('Content-Type', /javascript/)
          .expect(200, done);
    });
  });
});

var endPoint = function (point) {
  return `/api/${apiVersion}/${point}?apikey=${apiKey}`;
};

function makeid() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
