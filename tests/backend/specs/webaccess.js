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

describe('webaccess with authnFailure, authzFailure, authFailure hooks', function() {
  const Handler = class {
    constructor(hookName) {
      this.hookName = hookName;
      this.shouldHandle = false;
      this.called = false;
    }
    handle(hookName, context, cb) {
      assert.equal(hookName, this.hookName);
      assert(context != null);
      assert(context.req != null);
      assert(context.res != null);
      assert(!this.called);
      this.called = true;
      if (this.shouldHandle) {
        context.res.status(200).send(this.hookName);
        return cb([true]);
      }
      return cb([]);
    }
  };
  const handlers = {};
  const hookNames = ['authnFailure', 'authzFailure', 'authFailure'];
  const settingsBackup = {};
  const hooksBackup = {};

  beforeEach(function() {
    Object.assign(settingsBackup, settings);
    hookNames.forEach((hookName) => {
      if (plugins.hooks[hookName] == null) plugins.hooks[hookName] = [];
    });
    Object.assign(hooksBackup, plugins.hooks);
    hookNames.forEach((hookName) => {
      const handler = new Handler(hookName);
      handlers[hookName] = handler;
      plugins.hooks[hookName] = [{hook_fn: handler.handle.bind(handler)}];
    });
    settings.requireAuthentication = true;
    settings.requireAuthorization = true;
    settings.users = {
      admin: {password: 'admin-password', is_admin: true},
      user: {password: 'user-password'},
    };
  });
  afterEach(function() {
    Object.assign(settings, settingsBackup);
    Object.assign(plugins.hooks, hooksBackup);
  });

  // authn failure tests
  it('authn fail, no hooks handle -> 401', async function() {
    await agent.get('/').expect(401);
    assert(handlers['authnFailure'].called);
    assert(!handlers['authzFailure'].called);
    assert(handlers['authFailure'].called);
  });
  it('authn fail, authnFailure handles', async function() {
    handlers['authnFailure'].shouldHandle = true;
    await agent.get('/').expect(200, 'authnFailure');
    assert(handlers['authnFailure'].called);
    assert(!handlers['authzFailure'].called);
    assert(!handlers['authFailure'].called);
  });
  it('authn fail, authFailure handles', async function() {
    handlers['authFailure'].shouldHandle = true;
    await agent.get('/').expect(200, 'authFailure');
    assert(handlers['authnFailure'].called);
    assert(!handlers['authzFailure'].called);
    assert(handlers['authFailure'].called);
  });
  it('authnFailure trumps authFailure', async function() {
    handlers['authnFailure'].shouldHandle = true;
    handlers['authFailure'].shouldHandle = true;
    await agent.get('/').expect(200, 'authnFailure');
    assert(handlers['authnFailure'].called);
    assert(!handlers['authFailure'].called);
  });

  // authz failure tests
  it('authz fail, no hooks handle -> 403', async function() {
    await agent.get('/').auth('user', 'user-password').expect(403);
    assert(!handlers['authnFailure'].called);
    assert(handlers['authzFailure'].called);
    assert(handlers['authFailure'].called);
  });
  it('authz fail, authzFailure handles', async function() {
    handlers['authzFailure'].shouldHandle = true;
    await agent.get('/').auth('user', 'user-password').expect(200, 'authzFailure');
    assert(!handlers['authnFailure'].called);
    assert(handlers['authzFailure'].called);
    assert(!handlers['authFailure'].called);
  });
  it('authz fail, authFailure handles', async function() {
    handlers['authFailure'].shouldHandle = true;
    await agent.get('/').auth('user', 'user-password').expect(200, 'authFailure');
    assert(!handlers['authnFailure'].called);
    assert(handlers['authzFailure'].called);
    assert(handlers['authFailure'].called);
  });
  it('authzFailure trumps authFailure', async function() {
    handlers['authzFailure'].shouldHandle = true;
    handlers['authFailure'].shouldHandle = true;
    await agent.get('/').auth('user', 'user-password').expect(200, 'authzFailure');
    assert(handlers['authzFailure'].called);
    assert(!handlers['authFailure'].called);
  });
});
