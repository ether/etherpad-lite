var express = require('express');
var log4js = require('log4js');
var httpLogger = log4js.getLogger("http");
var settings = require('../../utils/Settings');


//checks for basic http auth
exports.basicAuth = function (req, res, next) {
  
  // When handling HTTP-Auth, an undefined password will lead to no authorization at all
  var pass = settings.httpAuth || '';
  
  if (req.path.indexOf('/admin') == 0) {
    var pass = settings.adminHttpAuth;
    
  }
  
  // Just pass if password is an empty string
  if (pass === '') {
    return next();
  }
  
  
  // If a password has been set and auth headers are present...
  if (pass && req.headers.authorization && req.headers.authorization.search('Basic ') === 0) {
    // ...check login and password
    if (new Buffer(req.headers.authorization.split(' ')[1], 'base64').toString() === pass) {
      return next();
    }
  }

  // Otherwise return Auth required Headers, delayed for 1 second, if auth failed.
  res.header('WWW-Authenticate', 'Basic realm="Protected Area"');
  if (req.headers.authorization) {
    setTimeout(function () {
      res.send('Authentication required', 401);
    }, 1000);
  } else {
    res.send('Authentication required', 401);
  }
}

exports.expressConfigure = function (hook_name, args, cb) {
  args.app.use(exports.basicAuth);

  // If the log level specified in the config file is WARN or ERROR the application server never starts listening to requests as reported in issue #158.
  // Not installing the log4js connect logger when the log level has a higher severity than INFO since it would not log at that level anyway.
  if (!(settings.loglevel === "WARN" || settings.loglevel == "ERROR"))
    args.app.use(log4js.connectLogger(httpLogger, { level: log4js.levels.INFO, format: ':status, :method :url'}));
  args.app.use(express.cookieParser());
}
