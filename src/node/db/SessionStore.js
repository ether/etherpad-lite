 /* 
 * Stores session data in the database
 * Source; https://github.com/edy-b/SciFlowWriter/blob/develop/available_plugins/ep_sciflowwriter/db/DirtyStore.js
 * This is not used for authors that are created via the API at current
 */

var Store = require('ep_etherpad-lite/node_modules/express-session').Store,
  db = require('ep_etherpad-lite/node/db/DB').db,
  log4js = require('ep_etherpad-lite/node_modules/log4js'),
  messageLogger = log4js.getLogger("SessionStore");

var SessionStore = module.exports = function SessionStore() {};

SessionStore.prototype.__proto__ = Store.prototype;

SessionStore.prototype.get = function(sid, fn){
  messageLogger.debug('GET ' + sid);
  var self = this;
  db.get("sessionstorage:" + sid, function (err, sess)
  {
    if (sess) {
      sess.cookie._expires = 'string' == typeof sess.cookie._expires ? new Date(sess.cookie._expires) : sess.cookie._expires;
      if (!sess.cookie._expires || new Date() < sess.cookie._expires) {
        fn(null, sess); // Looks good, proceed :)
      } else {
        self.destroy(sid, fn); // Destroy sessions that are old
      }
    } else {
      fn();
    }
  });
};

SessionStore.prototype.set = function(sid, sess, fn){
  var currentTS = new Date().getTime(); // Get current timestamp
  messageLogger.debug('SET ' + sid);
  sess._expires = currentTS + 86400; // Session expires in a day
  db.set("sessionstorage:" + sid, sess); // Write the session to the database
  process.nextTick(function(){
    if(fn) fn();
  });
};

SessionStore.prototype.destroy = function(sid, fn){
  messageLogger.debug('DESTROY ' + sid);
  db.remove("sessionstorage:" + sid);
  process.nextTick(function(){
    if(fn) fn();
  });
};

SessionStore.prototype.all = function(fn){
  messageLogger.debug('ALL');
  var sessions = [];
  db.forEach(function(key, value){
    if (key.substr(0,15) === "sessionstorage:") {
      sessions.push(value);
    }
  });
  fn(null, sessions);
};

SessionStore.prototype.clear = function(fn){
  messageLogger.debug('CLEAR');
  db.forEach(function(key, value){
    if (key.substr(0,15) === "sessionstorage:") {
      db.db.remove("session:" + key);
    }
  });
  if(fn) fn();
};

SessionStore.prototype.length = function(fn){
  messageLogger.debug('LENGTH');
  var i = 0;
  db.forEach(function(key, value){
    if (key.substr(0,15) === "sessionstorage:") {
      i++;
    }
  });
  fn(null, i);
};
