'use strict';

const assert = require('assert').strict;
const common = require('../common');
const plugins = require('../../../static/js/pluginfw/plugin_defs');
const settings = require('../../../node/utils/Settings');

describe(__filename, function () {
  this.timeout(30000);
  let agent;
  const backups = {};
  const authHookNames = ['preAuthorize', 'authenticate', 'authorize'];
  const failHookNames = ['preAuthzFailure', 'authnFailure', 'authzFailure', 'authFailure'];
  const makeHook = (hookName, hookFn) => ({
    hook_fn: hookFn,
    hook_fn_name: `fake_plugin/${hookName}`,
    hook_name: hookName,
    part: {plugin: 'fake_plugin'},
  });

  before(async function () { agent = await common.init(); });
  beforeEach(async function () {
    backups.hooks = {};
    for (const hookName of authHookNames.concat(failHookNames)) {
      backups.hooks[hookName] = plugins.hooks[hookName];
      plugins.hooks[hookName] = [];
    }
    backups.settings = {};
    for (const setting of ['requireAuthentication', 'requireAuthorization', 'users']) {
      backups.settings[setting] = settings[setting];
    }
    settings.requireAuthentication = false;
    settings.requireAuthorization = false;
    settings.users = {
      admin: {password: 'admin-password', is_admin: true},
      user: {password: 'user-password'},
    };
  });
  afterEach(async function () {
    Object.assign(plugins.hooks, backups.hooks);
    Object.assign(settings, backups.settings);
  });

  describe('webaccess: without plugins', function () {
    it('!authn !authz anonymous / -> 200', async function () {
      settings.requireAuthentication = false;
      settings.requireAuthorization = false;
      await agent.get('/').expect(200);
    });
    it('!authn !authz anonymous /admin/ -> 401', async function () {
      settings.requireAuthentication = false;
      settings.requireAuthorization = false;
      await agent.get('/admin/').expect(401);
    });
    it('authn !authz anonymous / -> 401', async function () {
      settings.requireAuthentication = true;
      settings.requireAuthorization = false;
      await agent.get('/').expect(401);
    });
    it('authn !authz user / -> 200', async function () {
      settings.requireAuthentication = true;
      settings.requireAuthorization = false;
      await agent.get('/').auth('user', 'user-password').expect(200);
    });
    it('authn !authz user /admin/ -> 403', async function () {
      settings.requireAuthentication = true;
      settings.requireAuthorization = false;
      await agent.get('/admin/').auth('user', 'user-password').expect(403);
    });
    it('authn !authz admin / -> 200', async function () {
      settings.requireAuthentication = true;
      settings.requireAuthorization = false;
      await agent.get('/').auth('admin', 'admin-password').expect(200);
    });
    it('authn !authz admin /admin/ -> 200', async function () {
      settings.requireAuthentication = true;
      settings.requireAuthorization = false;
      await agent.get('/admin/').auth('admin', 'admin-password').expect(200);
    });
    it('authn authz user / -> 403', async function () {
      settings.requireAuthentication = true;
      settings.requireAuthorization = true;
      await agent.get('/').auth('user', 'user-password').expect(403);
    });
    it('authn authz user /admin/ -> 403', async function () {
      settings.requireAuthentication = true;
      settings.requireAuthorization = true;
      await agent.get('/admin/').auth('user', 'user-password').expect(403);
    });
    it('authn authz admin / -> 200', async function () {
      settings.requireAuthentication = true;
      settings.requireAuthorization = true;
      await agent.get('/').auth('admin', 'admin-password').expect(200);
    });
    it('authn authz admin /admin/ -> 200', async function () {
      settings.requireAuthentication = true;
      settings.requireAuthorization = true;
      await agent.get('/admin/').auth('admin', 'admin-password').expect(200);
    });

    describe('login fails if password is nullish', function () {
      for (const adminPassword of [undefined, null]) {
        // https://tools.ietf.org/html/rfc7617 says that the username and password are sent as
        // base64(username + ':' + password), but there's nothing stopping a malicious user from
        // sending just base64(username) (no colon). The lack of colon could throw off credential
        // parsing, resulting in successful comparisons against a null or undefined password.
        for (const creds of ['admin', 'admin:']) {
          it(`admin password: ${adminPassword} credentials: ${creds}`, async function () {
            settings.users.admin.password = adminPassword;
            const encCreds = Buffer.from(creds).toString('base64');
            await agent.get('/admin/').set('Authorization', `Basic ${encCreds}`).expect(401);
          });
        }
      }
    });
  });

  describe('webaccess: preAuthorize, authenticate, and authorize hooks', function () {
    let callOrder;
    const Handler = class {
      constructor(hookName, suffix) {
        this.called = false;
        this.hookName = hookName;
        this.innerHandle = () => [];
        this.id = hookName + suffix;
        this.checkContext = () => {};
      }
      handle(hookName, context, cb) {
        assert.equal(hookName, this.hookName);
        assert(context != null);
        assert(context.req != null);
        assert(context.res != null);
        assert(context.next != null);
        this.checkContext(context);
        assert(!this.called);
        this.called = true;
        callOrder.push(this.id);
        return cb(this.innerHandle(context.req));
      }
    };
    const handlers = {};

    beforeEach(async function () {
      callOrder = [];
      for (const hookName of authHookNames) {
        // Create two handlers for each hook to test deferral to the next function.
        const h0 = new Handler(hookName, '_0');
        const h1 = new Handler(hookName, '_1');
        handlers[hookName] = [h0, h1];
        plugins.hooks[hookName] = [
          makeHook(hookName, h0.handle.bind(h0)),
          makeHook(hookName, h1.handle.bind(h1)),
        ];
      }
    });

    describe('preAuthorize', function () {
      beforeEach(async function () {
        settings.requireAuthentication = false;
        settings.requireAuthorization = false;
      });

      it('defers if it returns []', async function () {
        await agent.get('/').expect(200);
        // Note: The preAuthorize hook always runs even if requireAuthorization is false.
        assert.deepEqual(callOrder, ['preAuthorize_0', 'preAuthorize_1']);
      });
      it('bypasses authenticate and authorize hooks when true is returned', async function () {
        settings.requireAuthentication = true;
        settings.requireAuthorization = true;
        handlers.preAuthorize[0].innerHandle = () => [true];
        await agent.get('/').expect(200);
        assert.deepEqual(callOrder, ['preAuthorize_0']);
      });
      it('bypasses authenticate and authorize hooks when false is returned', async function () {
        settings.requireAuthentication = true;
        settings.requireAuthorization = true;
        handlers.preAuthorize[0].innerHandle = () => [false];
        await agent.get('/').expect(403);
        assert.deepEqual(callOrder, ['preAuthorize_0']);
      });
      it('bypasses authenticate and authorize hooks for static content, defers', async function () {
        settings.requireAuthentication = true;
        settings.requireAuthorization = true;
        await agent.get('/static/robots.txt').expect(200);
        assert.deepEqual(callOrder, ['preAuthorize_0', 'preAuthorize_1']);
      });
      it('cannot grant access to /admin', async function () {
        handlers.preAuthorize[0].innerHandle = () => [true];
        await agent.get('/admin/').expect(401);
        // Notes:
        //   * preAuthorize[1] is called despite preAuthorize[0] returning a non-empty list because
        //     'true' entries are ignored for /admin/* requests.
        //   * The authenticate hook always runs for /admin/* requests even if
        //     settings.requireAuthentication is false.
        assert.deepEqual(callOrder, ['preAuthorize_0',
          'preAuthorize_1',
          'authenticate_0',
          'authenticate_1']);
      });
      it('can deny access to /admin', async function () {
        handlers.preAuthorize[0].innerHandle = () => [false];
        await agent.get('/admin/').auth('admin', 'admin-password').expect(403);
        assert.deepEqual(callOrder, ['preAuthorize_0']);
      });
      it('runs preAuthzFailure hook when access is denied', async function () {
        handlers.preAuthorize[0].innerHandle = () => [false];
        let called = false;
        plugins.hooks.preAuthzFailure = [makeHook('preAuthzFailure', (hookName, {req, res}, cb) => {
          assert.equal(hookName, 'preAuthzFailure');
          assert(req != null);
          assert(res != null);
          assert(!called);
          called = true;
          res.status(200).send('injected');
          return cb([true]);
        })];
        await agent.get('/admin/').auth('admin', 'admin-password').expect(200, 'injected');
        assert(called);
      });
      it('returns 500 if an exception is thrown', async function () {
        handlers.preAuthorize[0].innerHandle = () => { throw new Error('exception test'); };
        await agent.get('/').expect(500);
      });
    });

    describe('authenticate', function () {
      beforeEach(async function () {
        settings.requireAuthentication = true;
        settings.requireAuthorization = false;
      });

      it('is not called if !requireAuthentication and not /admin/*', async function () {
        settings.requireAuthentication = false;
        await agent.get('/').expect(200);
        assert.deepEqual(callOrder, ['preAuthorize_0', 'preAuthorize_1']);
      });
      it('is called if !requireAuthentication and /admin/*', async function () {
        settings.requireAuthentication = false;
        await agent.get('/admin/').expect(401);
        assert.deepEqual(callOrder, ['preAuthorize_0',
          'preAuthorize_1',
          'authenticate_0',
          'authenticate_1']);
      });
      it('defers if empty list returned', async function () {
        await agent.get('/').expect(401);
        assert.deepEqual(callOrder, ['preAuthorize_0',
          'preAuthorize_1',
          'authenticate_0',
          'authenticate_1']);
      });
      it('does not defer if return [true], 200', async function () {
        handlers.authenticate[0].innerHandle = (req) => { req.session.user = {}; return [true]; };
        await agent.get('/').expect(200);
        // Note: authenticate_1 was not called because authenticate_0 handled it.
        assert.deepEqual(callOrder, ['preAuthorize_0', 'preAuthorize_1', 'authenticate_0']);
      });
      it('does not defer if return [false], 401', async function () {
        handlers.authenticate[0].innerHandle = (req) => [false];
        await agent.get('/').expect(401);
        // Note: authenticate_1 was not called because authenticate_0 handled it.
        assert.deepEqual(callOrder, ['preAuthorize_0', 'preAuthorize_1', 'authenticate_0']);
      });
      it('falls back to HTTP basic auth', async function () {
        await agent.get('/').auth('user', 'user-password').expect(200);
        assert.deepEqual(callOrder, ['preAuthorize_0',
          'preAuthorize_1',
          'authenticate_0',
          'authenticate_1']);
      });
      it('passes settings.users in context', async function () {
        handlers.authenticate[0].checkContext = ({users}) => {
          assert.equal(users, settings.users);
        };
        await agent.get('/').expect(401);
        assert.deepEqual(callOrder, ['preAuthorize_0',
          'preAuthorize_1',
          'authenticate_0',
          'authenticate_1']);
      });
      it('passes user, password in context if provided', async function () {
        handlers.authenticate[0].checkContext = ({username, password}) => {
          assert.equal(username, 'user');
          assert.equal(password, 'user-password');
        };
        await agent.get('/').auth('user', 'user-password').expect(200);
        assert.deepEqual(callOrder, ['preAuthorize_0',
          'preAuthorize_1',
          'authenticate_0',
          'authenticate_1']);
      });
      it('does not pass user, password in context if not provided', async function () {
        handlers.authenticate[0].checkContext = ({username, password}) => {
          assert(username == null);
          assert(password == null);
        };
        await agent.get('/').expect(401);
        assert.deepEqual(callOrder, ['preAuthorize_0',
          'preAuthorize_1',
          'authenticate_0',
          'authenticate_1']);
      });
      it('errors if req.session.user is not created', async function () {
        handlers.authenticate[0].innerHandle = () => [true];
        await agent.get('/').expect(500);
        assert.deepEqual(callOrder, ['preAuthorize_0', 'preAuthorize_1', 'authenticate_0']);
      });
      it('returns 500 if an exception is thrown', async function () {
        handlers.authenticate[0].innerHandle = () => { throw new Error('exception test'); };
        await agent.get('/').expect(500);
        assert.deepEqual(callOrder, ['preAuthorize_0', 'preAuthorize_1', 'authenticate_0']);
      });
    });

    describe('authorize', function () {
      beforeEach(async function () {
        settings.requireAuthentication = true;
        settings.requireAuthorization = true;
      });

      it('is not called if !requireAuthorization (non-/admin)', async function () {
        settings.requireAuthorization = false;
        await agent.get('/').auth('user', 'user-password').expect(200);
        assert.deepEqual(callOrder, ['preAuthorize_0',
          'preAuthorize_1',
          'authenticate_0',
          'authenticate_1']);
      });
      it('is not called if !requireAuthorization (/admin)', async function () {
        settings.requireAuthorization = false;
        await agent.get('/admin/').auth('admin', 'admin-password').expect(200);
        assert.deepEqual(callOrder, ['preAuthorize_0',
          'preAuthorize_1',
          'authenticate_0',
          'authenticate_1']);
      });
      it('defers if empty list returned', async function () {
        await agent.get('/').auth('user', 'user-password').expect(403);
        assert.deepEqual(callOrder, ['preAuthorize_0',
          'preAuthorize_1',
          'authenticate_0',
          'authenticate_1',
          'authorize_0',
          'authorize_1']);
      });
      it('does not defer if return [true], 200', async function () {
        handlers.authorize[0].innerHandle = () => [true];
        await agent.get('/').auth('user', 'user-password').expect(200);
        // Note: authorize_1 was not called because authorize_0 handled it.
        assert.deepEqual(callOrder, ['preAuthorize_0',
          'preAuthorize_1',
          'authenticate_0',
          'authenticate_1',
          'authorize_0']);
      });
      it('does not defer if return [false], 403', async function () {
        handlers.authorize[0].innerHandle = (req) => [false];
        await agent.get('/').auth('user', 'user-password').expect(403);
        // Note: authorize_1 was not called because authorize_0 handled it.
        assert.deepEqual(callOrder, ['preAuthorize_0',
          'preAuthorize_1',
          'authenticate_0',
          'authenticate_1',
          'authorize_0']);
      });
      it('passes req.path in context', async function () {
        handlers.authorize[0].checkContext = ({resource}) => {
          assert.equal(resource, '/');
        };
        await agent.get('/').auth('user', 'user-password').expect(403);
        assert.deepEqual(callOrder, ['preAuthorize_0',
          'preAuthorize_1',
          'authenticate_0',
          'authenticate_1',
          'authorize_0',
          'authorize_1']);
      });
      it('returns 500 if an exception is thrown', async function () {
        handlers.authorize[0].innerHandle = () => { throw new Error('exception test'); };
        await agent.get('/').auth('user', 'user-password').expect(500);
        assert.deepEqual(callOrder, ['preAuthorize_0',
          'preAuthorize_1',
          'authenticate_0',
          'authenticate_1',
          'authorize_0']);
      });
    });
  });

  describe('webaccess: authnFailure, authzFailure, authFailure hooks', function () {
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

    beforeEach(async function () {
      failHookNames.forEach((hookName) => {
        const handler = new Handler(hookName);
        handlers[hookName] = handler;
        plugins.hooks[hookName] = [makeHook(hookName, handler.handle.bind(handler))];
      });
      settings.requireAuthentication = true;
      settings.requireAuthorization = true;
    });

    // authn failure tests
    it('authn fail, no hooks handle -> 401', async function () {
      await agent.get('/').expect(401);
      assert(handlers.authnFailure.called);
      assert(!handlers.authzFailure.called);
      assert(handlers.authFailure.called);
    });
    it('authn fail, authnFailure handles', async function () {
      handlers.authnFailure.shouldHandle = true;
      await agent.get('/').expect(200, 'authnFailure');
      assert(handlers.authnFailure.called);
      assert(!handlers.authzFailure.called);
      assert(!handlers.authFailure.called);
    });
    it('authn fail, authFailure handles', async function () {
      handlers.authFailure.shouldHandle = true;
      await agent.get('/').expect(200, 'authFailure');
      assert(handlers.authnFailure.called);
      assert(!handlers.authzFailure.called);
      assert(handlers.authFailure.called);
    });
    it('authnFailure trumps authFailure', async function () {
      handlers.authnFailure.shouldHandle = true;
      handlers.authFailure.shouldHandle = true;
      await agent.get('/').expect(200, 'authnFailure');
      assert(handlers.authnFailure.called);
      assert(!handlers.authFailure.called);
    });

    // authz failure tests
    it('authz fail, no hooks handle -> 403', async function () {
      await agent.get('/').auth('user', 'user-password').expect(403);
      assert(!handlers.authnFailure.called);
      assert(handlers.authzFailure.called);
      assert(handlers.authFailure.called);
    });
    it('authz fail, authzFailure handles', async function () {
      handlers.authzFailure.shouldHandle = true;
      await agent.get('/').auth('user', 'user-password').expect(200, 'authzFailure');
      assert(!handlers.authnFailure.called);
      assert(handlers.authzFailure.called);
      assert(!handlers.authFailure.called);
    });
    it('authz fail, authFailure handles', async function () {
      handlers.authFailure.shouldHandle = true;
      await agent.get('/').auth('user', 'user-password').expect(200, 'authFailure');
      assert(!handlers.authnFailure.called);
      assert(handlers.authzFailure.called);
      assert(handlers.authFailure.called);
    });
    it('authzFailure trumps authFailure', async function () {
      handlers.authzFailure.shouldHandle = true;
      handlers.authFailure.shouldHandle = true;
      await agent.get('/').auth('user', 'user-password').expect(200, 'authzFailure');
      assert(handlers.authzFailure.called);
      assert(!handlers.authFailure.called);
    });
  });
});
