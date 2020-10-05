function m(mod) { return __dirname + '/../../src/' + mod; }

const log4js = require(m('node_modules/log4js'));
const server = require(m('node/server'));
const settings = require(m('node/utils/Settings'));
const supertest = require(m('node_modules/supertest'));
const webaccess = require(m('node/hooks/express/webaccess'));

const backups = {};
let inited = false;

exports.agent = null;
exports.baseUrl = null;
exports.httpServer = null;
exports.logger = log4js.getLogger('test');

exports.init = async function() {
  if (inited) return exports.agent;
  inited = true;

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

  after(async function() {
    webaccess.authnFailureDelayMs = backups.authnFailureDelayMs;
    await server.stop();
    // Note: This does not unset settings that were added.
    Object.assign(settings, backups.settings);
  });

  return exports.agent;
};
