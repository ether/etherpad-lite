'use strict';

const DB = require('./DB');
const Store = require('express-session').Store;
const log4js = require('log4js');
const util = require('util');

const logger = log4js.getLogger('SessionStore');

class SessionStore extends Store {
  async _checkExpiration(sid, sess) {
    const {cookie: {expires} = {}} = sess || {};
    if (expires && new Date() >= new Date(expires)) return await this._destroy(sid);
    return sess;
  }

  async _get(sid) {
    logger.debug(`GET ${sid}`);
    const s = await DB.get(`sessionstorage:${sid}`);
    return await this._checkExpiration(sid, s);
  }

  async _set(sid, sess) {
    logger.debug(`SET ${sid}`);
    sess = await this._checkExpiration(sid, sess);
    if (sess != null) await DB.set(`sessionstorage:${sid}`, sess);
  }

  async _destroy(sid) {
    logger.debug(`DESTROY ${sid}`);
    await DB.remove(`sessionstorage:${sid}`);
  }
}

// express-session doesn't support Promise-based methods. This is where the callbackified versions
// used by express-session are defined.
for (const m of ['get', 'set', 'destroy']) {
  SessionStore.prototype[m] = util.callbackify(SessionStore.prototype[`_${m}`]);
}

module.exports = SessionStore;
