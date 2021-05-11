'use strict';

/**
 * API specs
 *
 * Tests for generic overarching HTTP API related features not related to any
 * specific part of the data model or domain. For example: tests for versioning
 * and openapi definitions.
 */

const common = require('../../common');
const validateOpenAPI = require('openapi-schema-validation').validate;

let agent;
const apiKey = common.apiKey;
let apiVersion = 1;

const makeid = () => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const testPadId = makeid();

const endPoint = (point) => `/api/${apiVersion}/${point}?apikey=${apiKey}`;

describe(__filename, function () {
  before(async function () { agent = await common.init(); });

  it('can obtain API version', async function () {
    await agent.get('/api/')
        .expect(200)
        .expect((res) => {
          apiVersion = res.body.currentVersion;
          if (!res.body.currentVersion) throw new Error('No version set in API');
          return;
        });
  });

  it('can obtain valid openapi definition document', async function () {
    this.timeout(15000);
    await agent.get('/api/openapi.json')
        .expect(200)
        .expect((res) => {
          const {valid, errors} = validateOpenAPI(res.body, 3);
          if (!valid) {
            const prettyErrors = JSON.stringify(errors, null, 2);
            throw new Error(`Document is not valid OpenAPI. ${errors.length} ` +
                            `validation errors:\n${prettyErrors}`);
          }
        });
  });
});
