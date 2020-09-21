/*
 * Stores session data in the database
 * Source; https://github.com/edy-b/SciFlowWriter/blob/develop/available_plugins/ep_sciflowwriter/db/DirtyStore.js
 * This is not used for authors that are created via the API at current
 *
 * RPB: this module was not migrated to Promises, because it is only used via
 *      express-session, which can't actually use promises anyway.
 */

const Store = require('ep_etherpad-lite/node_modules/express-session').Store;
const db = require('ep_etherpad-lite/node/db/DB').db;
const log4js = require('ep_etherpad-lite/node_modules/log4js');

const logger = log4js.getLogger('SessionStore');

const SessionStore = module.exports = function SessionStore() {};

SessionStore.prototype.__proto__ = Store.prototype;

SessionStore.prototype.get = function(sid, fn) {
  logger.debug('GET ' + sid);
  db.get('sessionstorage:' + sid, (err, sess) => {
    if (sess) {
      sess.cookie.expires = ('string' == typeof sess.cookie.expires
                             ? new Date(sess.cookie.expires) : sess.cookie.expires);
      if (!sess.cookie.expires || new Date() < sess.cookie.expires) {
        fn(null, sess);
      } else {
        this.destroy(sid, fn);
      }
    } else {
      fn();
    }
  });
};

SessionStore.prototype.set = function(sid, sess, fn) {
  logger.debug('SET ' + sid);
  db.set('sessionstorage:' + sid, sess);
  if (fn) process.nextTick(fn);
};

SessionStore.prototype.destroy = function(sid, fn) {
  logger.debug('DESTROY ' + sid);
  db.remove('sessionstorage:' + sid);
  if (fn) process.nextTick(fn);
};
