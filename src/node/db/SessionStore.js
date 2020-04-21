/*
 * Stores session data in the database
 * Source; https://github.com/edy-b/SciFlowWriter/blob/develop/available_plugins/ep_sciflowwriter/db/DirtyStore.js
 * This is not used for authors that are created via the API at current
 *
 * RPB: this module was not migrated to Promises, because it is only used via
 *      express-session, which can't actually use promises anyway.
 */

var Store = require('ep_etherpad-lite/node_modules/express-session').Store,
  db = require('ep_etherpad-lite/node/db/DB').db,
  log4js = require('ep_etherpad-lite/node_modules/log4js'),
  messageLogger = log4js.getLogger("SessionStore");

var SessionStore = module.exports = function SessionStore() {};

SessionStore.prototype.__proto__ = Store.prototype;

SessionStore.prototype.get = function(sid, fn) {
  messageLogger.debug('GET ' + sid);

  var self = this;

  db.get("sessionstorage:" + sid, function(err, sess) {
    if (sess) {
      sess.cookie.expires = 'string' == typeof sess.cookie.expires ? new Date(sess.cookie.expires) : sess.cookie.expires;
      if (!sess.cookie.expires || new Date() < sess.cookie.expires) {
        fn(null, sess);
      } else {
        self.destroy(sid, fn);
      }
    } else {
      fn();
    }
  });
};

SessionStore.prototype.set = function(sid, sess, fn) {
  messageLogger.debug('SET ' + sid);

  // don't store passwords in DB
  if (sess.user && sess.user.password) {
    sess.user.password = "PASSWORD_HIDDEN";
  }

  db.set("sessionstorage:" + sid, sess);
  if (fn) {
    process.nextTick(fn);
  }
};

SessionStore.prototype.destroy = function(sid, fn) {
  messageLogger.debug('DESTROY ' + sid);

  db.remove("sessionstorage:" + sid);
  if (fn) {
    process.nextTick(fn);
  }
};

/*
 * RPB: the following methods are optional requirements for a compatible session
 *      store for express-session, but in any case appear to depend on a
 *      non-existent feature of ueberdb2
 */
if (db.forEach) {
  SessionStore.prototype.all = function(fn) {
    messageLogger.debug('ALL');

    var sessions = [];

    db.forEach(function(key, value) {
      if (key.substr(0,15) === "sessionstorage:") {
        sessions.push(value);
      }
    });
    fn(null, sessions);
  };

  SessionStore.prototype.clear = function(fn) {
    messageLogger.debug('CLEAR');

    db.forEach(function(key, value) {
      if (key.substr(0,15) === "sessionstorage:") {
        db.remove("session:" + key);
      }
    });
    if (fn) fn();
  };

  SessionStore.prototype.length = function(fn) {
    messageLogger.debug('LENGTH');

    var i = 0;

    db.forEach(function(key, value) {
      if (key.substr(0,15) === "sessionstorage:") {
        i++;
      }
    });
    fn(null, i);
  }
};
