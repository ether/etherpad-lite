const express = require('express');
const log4js = require('log4js');
const httpLogger = log4js.getLogger('http');
const settings = require('../../utils/Settings');
const hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');
const ueberStore = require('../../db/SessionStore');
const stats = require('ep_etherpad-lite/node/stats');
const sessionModule = require('express-session');
const cookieParser = require('cookie-parser');

exports.checkAccess = (req, res, next) => {
  const hookResultMangle = (cb) => {
    return (err, data) => {
      return cb(!err && data.length && data[0]);
    };
  };

  // This may be called twice per access: once before authentication is checked and once after (if
  // settings.requireAuthorization is true).
  const authorize = (cb) => {
    // Do not require auth for static paths and the API...this could be a bit brittle
    if (req.path.match(/^\/(static|javascripts|pluginfw|api)/)) return cb(true);

    if (req.path.toLowerCase().indexOf('/admin') !== 0) {
      if (!settings.requireAuthentication) return cb(true);
      if (!settings.requireAuthorization && req.session && req.session.user) return cb(true);
    }

    if (req.session && req.session.user && req.session.user.is_admin) return cb(true);

    hooks.aCallFirst('authorize', {req, res, next, resource: req.path}, hookResultMangle(cb));
  };

  /* Authentication OR authorization failed. */
  const failure = () => {
    return hooks.aCallFirst('authFailure', {req, res, next}, hookResultMangle((ok) => {
      if (ok) return;
      // No plugin handled the authn/authz failure. Fall back to basic authentication.
      res.header('WWW-Authenticate', 'Basic realm="Protected Area"');
      // Delay the error response for 1s to slow down brute force attacks.
      setTimeout(() => {
        res.status(401).send('Authentication Required');
      }, 1000);
    }));
  };

  // Access checking is done in three steps:
  //
  // 1) Try to just access the thing. If access fails (perhaps authentication has not yet completed,
  //    or maybe different credentials are required), go to the next step.
  // 2) Try to authenticate. (Or, if already logged in, reauthenticate with different credentials if
  //    supported by the authn scheme.) If authentication fails, give the user a 401 error to
  //    request new credentials. Otherwise, go to the next step.
  // 3) Try to access the thing again. If this fails, give the user a 401 error.
  //
  // Plugins can use the 'next' callback (from the hook's context) to break out at any point (e.g.,
  // to process an OAuth callback). Plugins can use the authFailure hook to override the default
  // error handling behavior (e.g., to redirect to a login page).

  let step1PreAuthenticate, step2Authenticate, step3Authorize;

  step1PreAuthenticate = () => {
    authorize((ok) => {
      if (ok) return next();
      step2Authenticate();
    });
  };

  step2Authenticate = () => {
    const ctx = {req, res, next};
    // If the HTTP basic auth header is present, extract the username and password so it can be
    // given to authn plugins.
    const httpBasicAuth =
        req.headers.authorization && req.headers.authorization.search('Basic ') === 0;
    if (httpBasicAuth) {
      const userpass =
          Buffer.from(req.headers.authorization.split(' ')[1], 'base64').toString().split(':');
      ctx.username = userpass.shift();
      ctx.password = userpass.join(':');
    }
    hooks.aCallFirst('authenticate', ctx, hookResultMangle((ok) => {
      if (!ok) {
        // Fall back to HTTP basic auth.
        if (!httpBasicAuth) return failure();
        if (!(ctx.username in settings.users)) {
          httpLogger.info(`Failed authentication from IP ${req.ip} - no such user`);
          return failure();
        }
        if (settings.users[ctx.username].password !== ctx.password) {
          httpLogger.info(`Failed authentication from IP ${req.ip} for user ${ctx.username} - incorrect password`);
          return failure();
        }
        httpLogger.info(`Successful authentication from IP ${req.ip} for user ${ctx.username}`);
        settings.users[ctx.username].username = ctx.username;
        req.session.user = settings.users[ctx.username];
      }
      step3Authorize();
    }));
  };

  step3Authorize = () => {
    authorize((ok) => {
      if (ok) return next();
      failure();
    });
  };

  step1PreAuthenticate();
};

exports.secret = null;

exports.expressConfigure = (hook_name, args, cb) => {
  // Measure response time
  args.app.use((req, res, next) => {
    const stopWatch = stats.timer('httpRequests').start();
    const sendFn = res.send;
    res.send = function() { // function, not arrow, due to use of 'arguments'
      stopWatch.end();
      sendFn.apply(res, arguments);
    };
    next();
  });

  // If the log level specified in the config file is WARN or ERROR the application server never starts listening to requests as reported in issue #158.
  // Not installing the log4js connect logger when the log level has a higher severity than INFO since it would not log at that level anyway.
  if (!(settings.loglevel === 'WARN' || settings.loglevel === 'ERROR'))
    args.app.use(log4js.connectLogger(httpLogger, {level: log4js.levels.DEBUG, format: ':status, :method :url'}));

  /* Do not let express create the session, so that we can retain a
   * reference to it for socket.io to use. Also, set the key (cookie
   * name) to a javascript identifier compatible string. Makes code
   * handling it cleaner :) */

  if (!exports.sessionStore) {
    exports.sessionStore = new ueberStore();
    exports.secret = settings.sessionKey;
  }

  const sameSite = settings.ssl ? 'Strict' : 'Lax';

  args.app.sessionStore = exports.sessionStore;
  args.app.use(sessionModule({
    secret: exports.secret,
    store: args.app.sessionStore,
    resave: false,
    saveUninitialized: true,
    name: 'express_sid',
    proxy: true,
    cookie: {
      /*
       * Firefox started enforcing sameSite, see https://github.com/ether/etherpad-lite/issues/3989
       * for details.  In response we set it based on if SSL certs are set in Etherpad.  Note that if
       * You use Nginx or so for reverse proxy this may cause problems.  Use Certificate pinning to remedy.
       */
      sameSite: sameSite,
      /*
       * The automatic express-session mechanism for determining if the
       * application is being served over ssl is similar to the one used for
       * setting the language cookie, which check if one of these conditions is
       * true:
       *
       * 1. we are directly serving the nodejs application over SSL, using the
       *    "ssl" options in settings.json
       *
       * 2. we are serving the nodejs application in plaintext, but we are using
       *    a reverse proxy that terminates SSL for us. In this case, the user
       *    has to set trustProxy = true in settings.json, and the information
       *    wheter the application is over SSL or not will be extracted from the
       *    X-Forwarded-Proto HTTP header
       *
       * Please note that this will not be compatible with applications being
       * served over http and https at the same time.
       *
       * reference: https://github.com/expressjs/session/blob/v1.17.0/README.md#cookiesecure
       */
      secure: 'auto',
    }
  }));

  args.app.use(cookieParser(settings.sessionKey, {}));

  args.app.use(exports.checkAccess);
};
