'use strict';

const assert = require('assert').strict;
const common = require('../common');
const io = require('socket.io-client');
const padManager = require('../../../node/db/PadManager');
const plugins = require('../../../static/js/pluginfw/plugin_defs');
const readOnlyManager = require('../../../node/db/ReadOnlyManager');
const setCookieParser = require('set-cookie-parser');
const settings = require('../../../node/utils/Settings');

const logger = common.logger;

// Waits for and returns the next named socket.io event. Rejects if there is any error while waiting
// (unless waiting for that error event).
const getSocketEvent = async (socket, event) => {
  const errorEvents = [
    'error',
    'connect_error',
    'connect_timeout',
    'reconnect_error',
    'reconnect_failed',
  ];
  const handlers = {};
  let timeoutId;
  return new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`timed out waiting for ${event} event`)), 1000);
    for (const event of errorEvents) {
      handlers[event] = (errorString) => {
        logger.debug(`socket.io ${event} event: ${errorString}`);
        reject(new Error(errorString));
      };
    }
    // This will overwrite one of the above handlers if the user is waiting for an error event.
    handlers[event] = (...args) => {
      logger.debug(`socket.io ${event} event`);
      if (args.length > 1) return resolve(args);
      resolve(args[0]);
    };
    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
  }).finally(() => {
    clearTimeout(timeoutId);
    Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
  });
};

// Establishes a new socket.io connection. Passes the cookies from the `set-cookie` header(s) in
// `res` (which may be nullish) to the server. Returns a socket.io Socket object.
const connect = async (res) => {
  // Convert the `set-cookie` header(s) into a `cookie` header.
  const resCookies = (res == null) ? {} : setCookieParser.parse(res, {map: true});
  const reqCookieHdr = Object.entries(resCookies).map(
      ([name, cookie]) => `${name}=${encodeURIComponent(cookie.value)}`).join('; ');

  logger.debug('socket.io connecting...');
  let padId = null;
  if (res) {
    padId = res.req.path.split('/p/')[1];
  }
  const socket = io(`${common.baseUrl}/`, {
    forceNew: true, // Different tests will have different query parameters.
    path: '/socket.io',
    // socketio.js-client on node.js doesn't support cookies (see https://git.io/JU8u9), so the
    // express_sid cookie must be passed as a query parameter.
    query: {cookie: reqCookieHdr, padId},
  });
  try {
    await getSocketEvent(socket, 'connect');
  } catch (e) {
    socket.close();
    throw e;
  }
  logger.debug('socket.io connected');

  return socket;
};

// Helper function to exchange CLIENT_READY+CLIENT_VARS messages for the named pad.
// Returns the CLIENT_VARS message from the server.
const handshake = async (socket, padID) => {
  logger.debug('sending CLIENT_READY...');
  socket.send({
    component: 'pad',
    type: 'CLIENT_READY',
    padId: padID,
    sessionID: null,
    token: 't.12345',
    protocolVersion: 2,
  });
  logger.debug('waiting for CLIENT_VARS response...');
  const msg = await getSocketEvent(socket, 'message');
  logger.debug('received CLIENT_VARS message');
  return msg;
};

describe(__filename, function () {
  this.timeout(30000);
  let agent;
  let authorize;
  const backups = {};
  const cleanUpPads = async () => {
    const padIds = ['pad', 'other-pad', 'päd'];
    await Promise.all(padIds.map(async (padId) => {
      if (await padManager.doesPadExist(padId)) {
        const pad = await padManager.getPad(padId);
        await pad.remove();
      }
    }));
  };
  let socket;

  before(async function () { agent = await common.init(); });
  beforeEach(async function () {
    backups.hooks = {};
    for (const hookName of ['preAuthorize', 'authenticate', 'authorize']) {
      backups.hooks[hookName] = plugins.hooks[hookName];
      plugins.hooks[hookName] = [];
    }
    backups.settings = {};
    for (const setting of ['editOnly', 'requireAuthentication', 'requireAuthorization', 'users']) {
      backups.settings[setting] = settings[setting];
    }
    settings.editOnly = false;
    settings.requireAuthentication = false;
    settings.requireAuthorization = false;
    settings.users = {
      admin: {password: 'admin-password', is_admin: true},
      user: {password: 'user-password'},
    };
    assert(socket == null);
    authorize = () => true;
    plugins.hooks.authorize = [{hook_fn: (hookName, {req}, cb) => cb([authorize(req)])}];
    await cleanUpPads();
  });
  afterEach(async function () {
    if (socket) socket.close();
    socket = null;
    await cleanUpPads();
    Object.assign(plugins.hooks, backups.hooks);
    Object.assign(settings, backups.settings);
  });

  describe('Normal accesses', function () {
    it('!authn anonymous cookie /p/pad -> 200, ok', async function () {
      this.timeout(600);
      const res = await agent.get('/p/pad').expect(200);
      socket = await connect(res);
      const clientVars = await handshake(socket, 'pad');
      assert.equal(clientVars.type, 'CLIENT_VARS');
    });
    it('!authn !cookie -> ok', async function () {
      this.timeout(400);
      socket = await connect(null);
      const clientVars = await handshake(socket, 'pad');
      assert.equal(clientVars.type, 'CLIENT_VARS');
    });
    it('!authn user /p/pad -> 200, ok', async function () {
      this.timeout(400);
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const clientVars = await handshake(socket, 'pad');
      assert.equal(clientVars.type, 'CLIENT_VARS');
    });
    it('authn user /p/pad -> 200, ok', async function () {
      this.timeout(400);
      settings.requireAuthentication = true;
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const clientVars = await handshake(socket, 'pad');
      assert.equal(clientVars.type, 'CLIENT_VARS');
    });

    for (const authn of [false, true]) {
      const desc = authn ? 'authn user' : '!authn anonymous';
      it(`${desc} read-only /p/pad -> 200, ok`, async function () {
        this.timeout(400);
        const get = (ep) => {
          let res = agent.get(ep);
          if (authn) res = res.auth('user', 'user-password');
          return res.expect(200);
        };
        settings.requireAuthentication = authn;
        let res = await get('/p/pad');
        socket = await connect(res);
        let clientVars = await handshake(socket, 'pad');
        assert.equal(clientVars.type, 'CLIENT_VARS');
        assert.equal(clientVars.data.readonly, false);
        const readOnlyId = clientVars.data.readOnlyId;
        assert(readOnlyManager.isReadOnlyId(readOnlyId));
        socket.close();
        res = await get(`/p/${readOnlyId}`);
        socket = await connect(res);
        clientVars = await handshake(socket, readOnlyId);
        assert.equal(clientVars.type, 'CLIENT_VARS');
        assert.equal(clientVars.data.readonly, true);
      });
    }

    it('authz user /p/pad -> 200, ok', async function () {
      this.timeout(400);
      settings.requireAuthentication = true;
      settings.requireAuthorization = true;
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const clientVars = await handshake(socket, 'pad');
      assert.equal(clientVars.type, 'CLIENT_VARS');
    });
    it('supports pad names with characters that must be percent-encoded', async function () {
      this.timeout(400);
      settings.requireAuthentication = true;
      // requireAuthorization is set to true here to guarantee that the user's padAuthorizations
      // object is populated. Technically this isn't necessary because the user's padAuthorizations
      // is currently populated even if requireAuthorization is false, but setting this to true
      // ensures the test remains useful if the implementation ever changes.
      settings.requireAuthorization = true;
      const encodedPadId = encodeURIComponent('päd');
      const res = await agent.get(`/p/${encodedPadId}`).auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const clientVars = await handshake(socket, 'päd');
      assert.equal(clientVars.type, 'CLIENT_VARS');
    });
  });

  describe('Abnormal access attempts', function () {
    it('authn anonymous /p/pad -> 401, error', async function () {
      this.timeout(400);
      settings.requireAuthentication = true;
      const res = await agent.get('/p/pad').expect(401);
      // Despite the 401, try to create the pad via a socket.io connection anyway.
      socket = await connect(res);
      const message = await handshake(socket, 'pad');
      assert.equal(message.accessStatus, 'deny');
    });

    it('authn anonymous read-only /p/pad -> 401, error', async function () {
      this.timeout(400);
      settings.requireAuthentication = true;
      let res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const clientVars = await handshake(socket, 'pad');
      assert.equal(clientVars.type, 'CLIENT_VARS');
      const readOnlyId = clientVars.data.readOnlyId;
      assert(readOnlyManager.isReadOnlyId(readOnlyId));
      socket.close();
      res = await agent.get(`/p/${readOnlyId}`).expect(401);
      // Despite the 401, try to read the pad via a socket.io connection anyway.
      socket = await connect(res);
      const message = await handshake(socket, readOnlyId);
      assert.equal(message.accessStatus, 'deny');
    });

    it('authn !cookie -> error', async function () {
      this.timeout(400);
      settings.requireAuthentication = true;
      socket = await connect(null);
      const message = await handshake(socket, 'pad');
      assert.equal(message.accessStatus, 'deny');
    });
    it('authorization bypass attempt -> error', async function () {
      this.timeout(400);
      // Only allowed to access /p/pad.
      authorize = (req) => req.path === '/p/pad';
      settings.requireAuthentication = true;
      settings.requireAuthorization = true;
      // First authenticate and establish a session.
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      // Accessing /p/other-pad should fail, despite the successful fetch of /p/pad.
      const message = await handshake(socket, 'other-pad');
      assert.equal(message.accessStatus, 'deny');
    });
  });

  describe('Authorization levels via authorize hook', function () {
    beforeEach(async function () {
      settings.requireAuthentication = true;
      settings.requireAuthorization = true;
    });

    it("level='create' -> can create", async function () {
      this.timeout(400);
      authorize = () => 'create';
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const clientVars = await handshake(socket, 'pad');
      assert.equal(clientVars.type, 'CLIENT_VARS');
      assert.equal(clientVars.data.readonly, false);
    });
    it('level=true -> can create', async function () {
      this.timeout(400);
      authorize = () => true;
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const clientVars = await handshake(socket, 'pad');
      assert.equal(clientVars.type, 'CLIENT_VARS');
      assert.equal(clientVars.data.readonly, false);
    });
    it("level='modify' -> can modify", async function () {
      this.timeout(400);
      await padManager.getPad('pad'); // Create the pad.
      authorize = () => 'modify';
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const clientVars = await handshake(socket, 'pad');
      assert.equal(clientVars.type, 'CLIENT_VARS');
      assert.equal(clientVars.data.readonly, false);
    });
    it("level='create' settings.editOnly=true -> unable to create", async function () {
      this.timeout(400);
      authorize = () => 'create';
      settings.editOnly = true;
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const message = await handshake(socket, 'pad');
      assert.equal(message.accessStatus, 'deny');
    });
    it("level='modify' settings.editOnly=false -> unable to create", async function () {
      this.timeout(400);
      authorize = () => 'modify';
      settings.editOnly = false;
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const message = await handshake(socket, 'pad');
      assert.equal(message.accessStatus, 'deny');
    });
    it("level='readOnly' -> unable to create", async function () {
      this.timeout(400);
      authorize = () => 'readOnly';
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const message = await handshake(socket, 'pad');
      assert.equal(message.accessStatus, 'deny');
    });
    it("level='readOnly' -> unable to modify", async function () {
      this.timeout(400);
      await padManager.getPad('pad'); // Create the pad.
      authorize = () => 'readOnly';
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const clientVars = await handshake(socket, 'pad');
      assert.equal(clientVars.type, 'CLIENT_VARS');
      assert.equal(clientVars.data.readonly, true);
    });
  });

  describe('Authorization levels via user settings', function () {
    beforeEach(async function () {
      settings.requireAuthentication = true;
    });

    it('user.canCreate = true -> can create and modify', async function () {
      this.timeout(400);
      settings.users.user.canCreate = true;
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const clientVars = await handshake(socket, 'pad');
      assert.equal(clientVars.type, 'CLIENT_VARS');
      assert.equal(clientVars.data.readonly, false);
    });
    it('user.canCreate = false -> unable to create', async function () {
      this.timeout(400);
      settings.users.user.canCreate = false;
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const message = await handshake(socket, 'pad');
      assert.equal(message.accessStatus, 'deny');
    });
    it('user.readOnly = true -> unable to create', async function () {
      this.timeout(400);
      settings.users.user.readOnly = true;
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const message = await handshake(socket, 'pad');
      assert.equal(message.accessStatus, 'deny');
    });
    it('user.readOnly = true -> unable to modify', async function () {
      this.timeout(400);
      await padManager.getPad('pad'); // Create the pad.
      settings.users.user.readOnly = true;
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const clientVars = await handshake(socket, 'pad');
      assert.equal(clientVars.type, 'CLIENT_VARS');
      assert.equal(clientVars.data.readonly, true);
    });
    it('user.readOnly = false -> can create and modify', async function () {
      this.timeout(400);
      settings.users.user.readOnly = false;
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const clientVars = await handshake(socket, 'pad');
      assert.equal(clientVars.type, 'CLIENT_VARS');
      assert.equal(clientVars.data.readonly, false);
    });
    it('user.readOnly = true, user.canCreate = true -> unable to create', async function () {
      this.timeout(400);
      settings.users.user.canCreate = true;
      settings.users.user.readOnly = true;
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const message = await handshake(socket, 'pad');
      assert.equal(message.accessStatus, 'deny');
    });
  });

  describe('Authorization level interaction between authorize hook and user settings', function () {
    beforeEach(async function () {
      settings.requireAuthentication = true;
      settings.requireAuthorization = true;
    });

    it('authorize hook does not elevate level from user settings', async function () {
      this.timeout(400);
      settings.users.user.readOnly = true;
      authorize = () => 'create';
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const message = await handshake(socket, 'pad');
      assert.equal(message.accessStatus, 'deny');
    });
    it('user settings does not elevate level from authorize hook', async function () {
      this.timeout(400);
      settings.users.user.readOnly = false;
      settings.users.user.canCreate = true;
      authorize = () => 'readOnly';
      const res = await agent.get('/p/pad').auth('user', 'user-password').expect(200);
      socket = await connect(res);
      const message = await handshake(socket, 'pad');
      assert.equal(message.accessStatus, 'deny');
    });
  });
});
