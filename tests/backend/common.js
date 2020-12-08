'use strict';

const apiHandler = require('ep_etherpad-lite/node/handler/APIHandler');
const log4js = require('ep_etherpad-lite/node_modules/log4js');
const process = require('process');
const server = require('ep_etherpad-lite/node/server');
const settings = require('ep_etherpad-lite/node/utils/Settings');
const supertest = require('ep_etherpad-lite/node_modules/supertest');
const webaccess = require('ep_etherpad-lite/node/hooks/express/webaccess');

const backups = {};
let inited = false;

exports.apiKey = apiHandler.exportedForTestingOnly.apiKey;
exports.agent = null;
exports.baseUrl = null;
exports.httpServer = null;
exports.logger = log4js.getLogger('test');

const logLevel = exports.logger.level;

// Mocha doesn't monitor unhandled Promise rejections, so convert them to uncaught exceptions.
// https://github.com/mochajs/mocha/issues/2640
process.on('unhandledRejection', (reason, promise) => { throw reason; });

exports.init = async function () {
  if (inited) return exports.agent;
  inited = true;

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
    await server.stop();
    // Note: This does not unset settings that were added.
    Object.assign(settings, backups.settings);
    log4js.setGlobalLogLevel(logLevel);
  });

  return exports.agent;
};
