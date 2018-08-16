/*
 * TODO: this polyfill is needed for Node 6.9 support.
 *
 * Once minimum supported Node version is raised to 8.9.0, it will be removed.
 */
if (!Object.values) {
  var log4js = require('log4js');
  var statsLogger = log4js.getLogger("stats");

  statsLogger.warn(`Enabling a polyfill to run on this Node version (${process.version}). Next Etherpad version will remove support for Node version < 8.9.0. Please update your runtime.`);

  var values = require('object.values');

  values.shim();
}

var measured = require('measured-core')

module.exports = measured.createCollection();
