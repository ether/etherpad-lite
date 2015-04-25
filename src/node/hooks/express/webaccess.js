var express = require('express');
var log4js = require('log4js');
var httpLogger = log4js.getLogger("http");
var settings = require('../../utils/Settings');
var hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');
var ueberStore = require('../../db/SessionStore');
var stats = require('ep_etherpad-lite/node/stats');
var sessionModule = require('express-session');

//checks for basic http auth
exports.basicAuth = function (req, res, next) {
  var hookResultMangle = function (cb) {
    return function (err, data) {
      return cb(!err && data.length && data[0]);
    }
  }

  var authorize = function (cb) {
    // Do not require auth for static paths and the API...this could be a bit brittle
    if (req.path.match(/^\/(static|javascripts|pluginfw|api)/)) return cb(true);

    if (req.path.indexOf('/admin') != 0) {
      if (!settings.requireAuthentication) return cb(true);
      if (!settings.requireAuthorization && req.session && req.session.user) return cb(true);
    }

    if (req.session && req.session.user && req.session.user.is_admin) return cb(true);

    hooks.aCallFirst("authorize", {req: req, res:res, next:next, resource: req.path}, hookResultMangle(cb));
  }

  var authenticate = function (cb) {
    // If auth headers are present use them to authenticate...
    if (req.headers.authorization && req.headers.authorization.search('Basic ') === 0) {
      var userpass = new Buffer(req.headers.authorization.split(' ')[1], 'base64').toString().split(":")
      var username = userpass.shift();
      var password = userpass.join(':');

      if (settings.users[username] != undefined && settings.users[username].password == password) {
        settings.users[username].username = username;
        req.session.user = settings.users[username];
        return cb(true);
      }
      return hooks.aCallFirst("authenticate", {req: req, res:res, next:next, username: username, password: password}, hookResultMangle(cb));
    }
    hooks.aCallFirst("authenticate", {req: req, res:res, next:next}, hookResultMangle(cb));
  }


  /* Authentication OR authorization failed. */
  var failure = function () {
    return hooks.aCallFirst("authFailure", {req: req, res:res, next:next}, hookResultMangle(function (ok) {
    if (ok) return;
      /* No plugin handler for invalid auth. Return Auth required
       * Headers, delayed for 1 second, if authentication failed
       * before. */
      res.header('WWW-Authenticate', 'Basic realm="Protected Area"');
      if (req.headers.authorization) {
        setTimeout(function () {
          res.status(401).send('Authentication required');
        }, 1000);
      } else {
        res.status(401).send('Authentication required');
      }
    }));
  }


  /* This is the actual authentication/authorization hoop. It is done in four steps:

     1) Try to just access the thing
     2) If not allowed using whatever creds are in the current session already, try to authenticate
     3) If authentication using already supplied credentials succeeds, try to access the thing again
     4) If all els fails, give the user a 401 to request new credentials

     Note that the process could stop already in step 3 with a redirect to login page.

  */
 
  authorize(function (ok) {
    if (ok) return next();
    authenticate(function (ok) {
      if (!ok) return failure();
      authorize(function (ok) {
        if (ok) return next();
        failure();
      });
    });
  });
}

exports.secret = null;

exports.expressConfigure = function (hook_name, args, cb) {
  // Measure response time
  args.app.use(function(req, res, next) {
    var stopWatch = stats.timer('httpRequests').start();
    var sendFn = res.send
    res.send = function() {
      stopWatch.end()
      sendFn.apply(res, arguments)
    }
    next()
  })

  // If the log level specified in the config file is WARN or ERROR the application server never starts listening to requests as reported in issue #158.
  // Not installing the log4js connect logger when the log level has a higher severity than INFO since it would not log at that level anyway.
  if (!(settings.loglevel === "WARN" || settings.loglevel == "ERROR"))
    args.app.use(log4js.connectLogger(httpLogger, { level: log4js.levels.DEBUG, format: ':status, :method :url'}));

  /* Do not let express create the session, so that we can retain a
   * reference to it for socket.io to use. Also, set the key (cookie
   * name) to a javascript identifier compatible string. Makes code
   * handling it cleaner :) */

  if (!exports.sessionStore) {
    exports.sessionStore = new ueberStore();
    exports.secret = settings.sessionKey; // Isn't this being reset each time the server spawns?
  }

  args.app.sessionStore = exports.sessionStore;
  args.app.use(sessionModule({secret: exports.secret, store: args.app.sessionStore, resave: true, saveUninitialized: true, name: 'express_sid' }));

  args.app.use(exports.basicAuth);
}

