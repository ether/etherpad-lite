'use strict';

const apiHandler = require('../../node/handler/APIHandler');
const io = require('socket.io-client');
const log4js = require('log4js');
const process = require('process');
const server = require('../../node/server');
const setCookieParser = require('set-cookie-parser');
const settings = require('../../node/utils/Settings');
const supertest = require('supertest');
const webaccess = require('../../node/hooks/express/webaccess');

const backups = {};
let agentPromise = null;

exports.apiKey = apiHandler.exportedForTestingOnly.apiKey;
exports.agent = null;
exports.baseUrl = null;
exports.httpServer = null;
exports.logger = log4js.getLogger('test');

const logger = exports.logger;
const logLevel = logger.level;

// Mocha doesn't monitor unhandled Promise rejections, so convert them to uncaught exceptions.
// https://github.com/mochajs/mocha/issues/2640
process.on('unhandledRejection', (reason, promise) => { throw reason; });

before(async function () {
  this.timeout(60000);
  await exports.init();
});

exports.init = async function () {
  if (agentPromise != null) return await agentPromise;
  let agentResolve;
  agentPromise = new Promise((resolve) => { agentResolve = resolve; });

  if (!logLevel.isLessThanOrEqualTo(log4js.levels.DEBUG)) {
    logger.warn('Disabling non-test logging for the duration of the test. ' +
                'To enable non-test logging, change the loglevel setting to DEBUG.');
    log4js.setGlobalLogLevel(log4js.levels.OFF);
    logger.setLevel(logLevel);
  }

  // Note: This is only a shallow backup.
  backups.settings = Object.assign({}, settings);
  // Start the Etherpad server on a random unused port.
  settings.port = 0;
  settings.ip = 'localhost';
  settings.importExportRateLimiting = {max: 0};
  settings.commitRateLimiting = {duration: 0.001, points: 1e6};
  exports.httpServer = await server.start();
  exports.baseUrl = `http://localhost:${exports.httpServer.address().port}`;
  logger.debug(`HTTP server at ${exports.baseUrl}`);
  // Create a supertest user agent for the HTTP server.
  exports.agent = supertest(exports.baseUrl);
  // Speed up authn tests.
  backups.authnFailureDelayMs = webaccess.authnFailureDelayMs;
  webaccess.authnFailureDelayMs = 0;

  after(async function () {
    webaccess.authnFailureDelayMs = backups.authnFailureDelayMs;
    // Note: This does not unset settings that were added.
    Object.assign(settings, backups.settings);
    log4js.setGlobalLogLevel(logLevel);
    await server.exit();
  });

  agentResolve(exports.agent);
  return exports.agent;
};

/**
 * Waits for the next named socket.io event. Rejects if there is an error event while waiting
 * (unless waiting for that error event).
 *
 * @param {io.Socket} socket - The socket.io Socket object to listen on.
 * @param {string} event - The socket.io Socket event to listen for.
 * @returns The argument(s) passed to the event handler.
 */
exports.waitForSocketEvent = async (socket, event) => {
  const errorEvents = [
    'error',
    'connect_error',
    'connect_timeout',
    'reconnect_error',
    'reconnect_failed',
  ];
  const handlers = new Map();
  let cancelTimeout;
  try {
    const timeoutP = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`timed out waiting for ${event} event`));
        cancelTimeout = () => {};
      }, 1000);
      cancelTimeout = () => {
        clearTimeout(timeout);
        resolve();
        cancelTimeout = () => {};
      };
    });
    const errorEventP = Promise.race(errorEvents.map((event) => new Promise((resolve, reject) => {
      handlers.set(event, (errorString) => {
        logger.debug(`socket.io ${event} event: ${errorString}`);
        reject(new Error(errorString));
      });
    })));
    const eventP = new Promise((resolve) => {
      // This will overwrite one of the above handlers if the user is waiting for an error event.
      handlers.set(event, (...args) => {
        logger.debug(`socket.io ${event} event`);
        if (args.length > 1) return resolve(args);
        resolve(args[0]);
      });
    });
    for (const [event, handler] of handlers) socket.on(event, handler);
    // timeoutP and errorEventP are guaranteed to never resolve here (they can only reject), so the
    // Promise returned by Promise.race() is guaranteed to resolve to the eventP value (if
    // the event arrives).
    return await Promise.race([timeoutP, errorEventP, eventP]);
  } finally {
    cancelTimeout();
    for (const [event, handler] of handlers) socket.off(event, handler);
  }
};

/**
 * Establishes a new socket.io connection.
 *
 * @param {object} [res] - Optional HTTP response object. The cookies from this response's
 *     `set-cookie` header(s) are passed to the server when opening the socket.io connection. If
 *     nullish, no cookies are passed to the server.
 * @returns {io.Socket} A socket.io client Socket object.
 */
exports.connect = async (res = null) => {
  // Convert the `set-cookie` header(s) into a `cookie` header.
  const resCookies = (res == null) ? {} : setCookieParser.parse(res, {map: true});
  const reqCookieHdr = Object.entries(resCookies).map(
      ([name, cookie]) => `${name}=${encodeURIComponent(cookie.value)}`).join('; ');

  logger.debug('socket.io connecting...');
  let padId = null;
  if (res) {
    padId = res.req.path.split('/p/')[1];
  }
  const socket = io(`${exports.baseUrl}/`, {
    forceNew: true, // Different tests will have different query parameters.
    path: '/socket.io',
    // socketio.js-client on node.js doesn't support cookies (see https://git.io/JU8u9), so the
    // express_sid cookie must be passed as a query parameter.
    query: {cookie: reqCookieHdr, padId},
  });
  try {
    await exports.waitForSocketEvent(socket, 'connect');
  } catch (e) {
    socket.close();
    throw e;
  }
  logger.debug('socket.io connected');

  return socket;
};

/**
 * Helper function to exchange CLIENT_READY+CLIENT_VARS messages for the named pad.
 *
 * @param {io.Socket} socket - Connected socket.io Socket object.
 * @param {string} padId - Which pad to join.
 * @returns The CLIENT_VARS message from the server.
 */
exports.handshake = async (socket, padId) => {
  logger.debug('sending CLIENT_READY...');
  socket.send({
    component: 'pad',
    type: 'CLIENT_READY',
    padId,
    sessionID: null,
    token: 't.12345',
  });
  logger.debug('waiting for CLIENT_VARS response...');
  const msg = await exports.waitForSocketEvent(socket, 'message');
  logger.debug('received CLIENT_VARS message');
  return msg;
};

/**
 * Convenience wrapper around `socket.send()` that waits for acknowledgement.
 */
exports.sendMessage = async (socket, message) => await new Promise((resolve, reject) => {
  socket.send(message, (errInfo) => {
    if (errInfo != null) {
      const {name, message} = errInfo;
      const err = new Error(message);
      err.name = name;
      reject(err);
      return;
    }
    resolve();
  });
});

const alphabet = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Generates a random string.
 *
 * @param {number} [len] - The desired length of the generated string.
 * @param {string} [charset] - Characters to pick from.
 * @returns {string}
 */
exports.randomString = (len = 10, charset = `${alphabet}${alphabet.toUpperCase()}0123456789`) => {
  let ret = '';
  while (ret.length < len) ret += charset[Math.floor(Math.random() * charset.length)];
  return ret;
};
