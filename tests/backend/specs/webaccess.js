function m(mod) { return __dirname + '/../../../src/' + mod; }

const assert = require('assert').strict;
const log4js = require(m('node_modules/log4js'));
const plugins = require(m('static/js/pluginfw/plugin_defs'));
const server = require(m('node/server'));
const settings = require(m('node/utils/Settings'));
const supertest = require(m('node_modules/supertest'));

let agent;
const logger = log4js.getLogger('test');

before(async function() {
  settings.port = 0;
  settings.ip = 'localhost';
  const httpServer = await server.start();
  const baseUrl = `http://localhost:${httpServer.address().port}`;
  logger.debug(`HTTP server at ${baseUrl}`);
  agent = supertest(baseUrl);
});

after(async function() {
  await server.stop();
});

describe('webaccess without any plugins', function() {
  const backup = {};

  before(async function() {
    Object.assign(backup, settings);
    settings.users = {
      admin: {password: 'admin-password', is_admin: true},
      user: {password: 'user-password'},
    };
  });

  after(async function() {
    Object.assign(settings, backup);
  });

  it('!authn !authz anonymous / -> 200', async function() {
    settings.requireAuthentication = false;
    settings.requireAuthorization = false;
    await agent.get('/').expect(200);
  });
  it('!authn !authz anonymous /admin/ -> 401', async function() {
    settings.requireAuthentication = false;
    settings.requireAuthorization = false;
    await agent.get('/admin/').expect(401);
  });
  it('authn !authz anonymous / -> 401', async function() {
    settings.requireAuthentication = true;
    settings.requireAuthorization = false;
    await agent.get('/').expect(401);
  });
  it('authn !authz user / -> 200', async function() {
    settings.requireAuthentication = true;
    settings.requireAuthorization = false;
    await agent.get('/').auth('user', 'user-password').expect(200);
  });
  it('authn !authz user /admin/ -> 403', async function() {
    settings.requireAuthentication = true;
    settings.requireAuthorization = false;
    await agent.get('/admin/').auth('user', 'user-password').expect(403);
  });
  it('authn !authz admin / -> 200', async function() {
    settings.requireAuthentication = true;
    settings.requireAuthorization = false;
    await agent.get('/').auth('admin', 'admin-password').expect(200);
  });
  it('authn !authz admin /admin/ -> 200', async function() {
    settings.requireAuthentication = true;
    settings.requireAuthorization = false;
    await agent.get('/admin/').auth('admin', 'admin-password').expect(200);
  });
  it('authn authz user / -> 403', async function() {
    settings.requireAuthentication = true;
    settings.requireAuthorization = true;
    await agent.get('/').auth('user', 'user-password').expect(403);
  });
  it('authn authz user /admin/ -> 403', async function() {
    settings.requireAuthentication = true;
    settings.requireAuthorization = true;
    await agent.get('/admin/').auth('user', 'user-password').expect(403);
  });
  it('authn authz admin / -> 200', async function() {
    settings.requireAuthentication = true;
    settings.requireAuthorization = true;
    await agent.get('/').auth('admin', 'admin-password').expect(200);
  });
  it('authn authz admin /admin/ -> 200', async function() {
    settings.requireAuthentication = true;
    settings.requireAuthorization = true;
    await agent.get('/admin/').auth('admin', 'admin-password').expect(200);
  });
});

describe('webaccess with authFailure plugin', function() {
  let handle, returnUndef, status, called;
  const authFailure = (hookName, context, cb) => {
    assert.equal(hookName, 'authFailure');
    assert(context != null);
    assert(context.req != null);
    assert(context.res != null);
    assert(context.next != null);
    assert(!called);
    called = true;
    if (handle) {
      context.res.status(status).send('injected content');
      return cb([true]);
    }
    if (returnUndef) return cb();
    return cb([]);
  };

  const settingsBackup = {};
  let authFailureHooksBackup;
  before(function() {
    Object.assign(settingsBackup, settings);
    authFailureHooksBackup = plugins.hooks.authFailure;
    plugins.hooks.authFailure = [{hook_fn: authFailure}];
    settings.requireAuthentication = true;
    settings.requireAuthorization = true;
    settings.users = {
      admin: {password: 'admin-password', is_admin: true},
      user: {password: 'user-password'},
    };
  });
  after(function() {
    Object.assign(settings, settingsBackup);
    plugins.hooks.authFailure = authFailureHooksBackup;
  });

  beforeEach(function() {
    handle = false;
    returnUndef = false;
    status = 200;
    called = false;
  });
  afterEach(function() {
    assert(called);
  });

  it('authn fail, hook handles -> 200', async function() {
    handle = true;
    await agent.get('/').expect(200, /injected content/);
  });
  it('authn fail, hook defers (undefined) -> 401', async function() {
    returnUndef = true;
    await agent.get('/').expect(401);
  });
  it('authn fail, hook defers (empty list) -> 401', async function() {
    await agent.get('/').expect(401);
  });
  it('authz fail, hook handles -> 200', async function() {
    handle = true;
    await agent.get('/').auth('user', 'user-password').expect(200, /injected content/);
  });
  it('authz fail, hook defers (undefined) -> 403', async function() {
    returnUndef = true;
    await agent.get('/').auth('user', 'user-password').expect(403);
  });
  it('authz fail, hook defers (empty list) -> 403', async function() {
    await agent.get('/').auth('user', 'user-password').expect(403);
  });
});
