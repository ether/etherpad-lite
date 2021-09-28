'use strict';
/*
 * Stores session data in the database
 * Source; https://github.com/edy-b/SciFlowWriter/blob/develop/available_plugins/ep_sciflowwriter/db/DirtyStore.js
 * This is not used for authors that are created via the API at current
 *
 * RPB: this module was not migrated to Promises, because it is only used via
 *      express-session, which can't actually use promises anyway.
 */

const DB = require('./DB');
const Store = require('express-session').Store;
const log4js = require('log4js');

const logger = log4js.getLogger('SessionStore');

module.exports = class SessionStore extends Store {
  get(sid, fn) {
    logger.debug(`GET ${sid}`);
    DB.db.get(`sessionstorage:${sid}`, (err, sess) => {
      if (sess) {
        sess.cookie.expires = ('string' === typeof sess.cookie.expires
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
  }

  set(sid, sess, fn) {
    logger.debug(`SET ${sid}`);
    DB.db.set(`sessionstorage:${sid}`, sess, fn);
  }

  destroy(sid, fn) {
    logger.debug(`DESTROY ${sid}`);
    DB.db.remove(`sessionstorage:${sid}`, fn);
  }
};
