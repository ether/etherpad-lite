'use strict';

const apiHandler = require('../../node/handler/APIHandler');
const log4js = require('log4js');
const process = require('process');
const server = require('../../node/server');
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

const logLevel = exports.logger.level;

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
    exports.logger.warn('Disabling non-test logging for the duration of the test. ' +
                        'To enable non-test logging, change the loglevel setting to DEBUG.');
    log4js.setGlobalLogLevel(log4js.levels.OFF);
    exports.logger.setLevel(logLevel);
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
  exports.logger.debug(`HTTP server at ${exports.baseUrl}`);
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
