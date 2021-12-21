'use strict';

const assert = require('assert').strict;
const common = require('../common');
const settings = require('../../../node/utils/Settings');
const superagent = require('superagent');

describe(__filename, function () {
  let agent;
  const backup = {};

  const getHealth = () => agent.get('/health')
      .accept('application/health+json')
      .buffer(true)
      .parse(superagent.parse['application/json'])
      .expect(200)
      .expect((res) => assert.equal(res.type, 'application/health+json'));

  before(async function () {
    agent = await common.init();
  });

  beforeEach(async function () {
    backup.settings = {};
    for (const setting of ['requireAuthentication', 'requireAuthorization']) {
      backup.settings[setting] = settings[setting];
    }
  });

  afterEach(async function () {
    Object.assign(settings, backup.settings);
  });

  it('/health works', async function () {
    const res = await getHealth();
    assert.equal(res.body.status, 'pass');
    assert.equal(res.body.releaseId, settings.getEpVersion());
  });

  it('auth is not required', async function () {
    settings.requireAuthentication = true;
    settings.requireAuthorization = true;
    const res = await getHealth();
    assert.equal(res.body.status, 'pass');
  });

  // We actually want to test that no express-session state is created, but that is difficult to do
  // without intrusive changes or unpleasant ueberdb digging. Instead, we assume that the lack of a
  // cookie means that no express-session state was created (how would express-session look up the
  // session state if no ID was returned to the client?).
  it('no cookie is returned', async function () {
    const res = await getHealth();
    const cookie = res.headers['set-cookie'];
    assert(cookie == null, `unexpected Set-Cookie: ${cookie}`);
  });
});
