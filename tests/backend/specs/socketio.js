function m(mod) { return __dirname + '/../../../src/' + mod; }

const assert = require('assert').strict;
const io = require(m('node_modules/socket.io-client'));
const log4js = require(m('node_modules/log4js'));
const padManager = require(m('node/db/PadManager'));
const plugins = require(m('static/js/pluginfw/plugin_defs'));
const server = require(m('node/server'));
const setCookieParser = require(m('node_modules/set-cookie-parser'));
const settings = require(m('node/utils/Settings'));
const supertest = require(m('node_modules/supertest'));

const logger = log4js.getLogger('test');
let client;
let baseUrl;

before(async () => {
  settings.port = 0;
  settings.ip = 'localhost';
  const httpServer = await server.start();
  baseUrl = `http://localhost:${httpServer.address().port}`;
  logger.debug(`HTTP server at ${baseUrl}`);
  client = supertest(baseUrl);
});

after(async () => {
  await server.stop();
});

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
    }
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
  const reqCookieHdr = Object.entries(resCookies).map(([name, cookie]) => {
    return `${name}=${encodeURIComponent(cookie.value)}`;
  }).join('; ');

  logger.debug('socket.io connecting...');
  const socket = io(`${baseUrl}/`, {
    forceNew: true, // Different tests will have different query parameters.
    path: '/socket.io',
    // socketio.js-client on node.js doesn't support cookies (see https://git.io/JU8u9), so the
    // express_sid cookie must be passed as a query parameter.
    query: {cookie: reqCookieHdr},
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
    password: null,
    token: 't.12345',
    protocolVersion: 2,
  });
  logger.debug('waiting for CLIENT_VARS response...');
  const msg = await getSocketEvent(socket, 'message');
  logger.debug('received CLIENT_VARS message');
  return msg;
};

describe('socket.io access checks', () => {
  const settingsBackup = {};
  let socket;
  beforeEach(async () => {
    Object.assign(settingsBackup, settings);
    assert(socket == null);
    settings.requireAuthentication = false;
    settings.requireAuthorization = false;
    settings.users = {
      admin: {password: 'admin-password', is_admin: true},
      user: {password: 'user-password'},
    };
    Promise.all(['pad', 'other-pad'].map(async (pad) => {
      if (await padManager.doesPadExist(pad)) (await padManager.getPad(pad)).remove();
    }));
  });
  afterEach(async () => {
    Object.assign(settings, settingsBackup);
    if (socket) socket.close();
    socket = null;
  });

  // Normal accesses.
  it('!authn anonymous /p/pad -> 200, ok', async () => {
    const res = await client.get('/p/pad').expect(200);
    // Should not throw.
    socket = await connect(res);
    const clientVars = await handshake(socket, 'pad');
    assert.equal(clientVars.type, 'CLIENT_VARS');
  });
  it('!authn user /p/pad -> 200, ok', async () => {
    const res = await client.get('/p/pad').auth('user', 'user-password').expect(200);
    // Should not throw.
    socket = await connect(res);
    const clientVars = await handshake(socket, 'pad');
    assert.equal(clientVars.type, 'CLIENT_VARS');
  });
  it('authn user /p/pad -> 200, ok', async () => {
    settings.requireAuthentication = true;
    const res = await client.get('/p/pad').auth('user', 'user-password').expect(200);
    // Should not throw.
    socket = await connect(res);
    const clientVars = await handshake(socket, 'pad');
    assert.equal(clientVars.type, 'CLIENT_VARS');
  });

  // Abnormal access attempts.
  it('authn anonymous /p/pad -> 401, error', async () => {
    settings.requireAuthentication = true;
    const res = await client.get('/p/pad').expect(401);
    // Despite the 401, try to create the pad via a socket.io connection anyway.
    await assert.rejects(connect(res), {message: /authentication required/i});
  });
  it('socket.io connection without express-session cookie -> error', async () => {
    settings.requireAuthentication = true;
    await assert.rejects(connect(null), {message: /signed express_sid cookie is required/i});
  });
  it('authorization bypass attempt -> error', async () => {
    plugins.hooks.authorize = [{hook_fn: (hookName, {req}, cb) => {
      if (req.session.user == null) return cb([]); // Hasn't authenticated yet.
      // Only allowed to access /p/pad.
      return cb([req.path === '/p/pad']);
    }}];
    settings.requireAuthentication = true;
    settings.requireAuthorization = true;
    // First authenticate and establish a session.
    const res = await client.get('/p/pad').auth('user', 'user-password').expect(200);
    // Connecting should work because the user successfully authenticated.
    socket = await connect(res);
    // Accessing /p/other-pad should fail, despite the successful fetch of /p/pad.
    const message = await handshake(socket, 'other-pad');
    assert.equal(message.accessStatus, 'deny');
  });
});
