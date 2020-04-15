var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
var express = require('express');
var settings = require('../utils/Settings');
var fs = require('fs');
var path = require('path');
var npm = require("npm/lib/npm.js");
var  _ = require("underscore");

var server;
var serverName;

exports.createServer = function () {
  console.log("Report bugs at https://github.com/ether/etherpad-lite/issues")

  serverName = `Etherpad ${settings.getGitCommit()} (https://etherpad.org)`;

  console.log(`Your Etherpad version is ${settings.getEpVersion()} (${settings.getGitCommit()})`);

  exports.restartServer();

  if (settings.ip === "") {
    // using Unix socket for connectivity
    console.log(`You can access your Etherpad instance using the Unix socket at ${settings.port}`);
  } else {
    console.log(`You can access your Etherpad instance at http://${settings.ip}:${settings.port}/`);
  }

  if (!_.isEmpty(settings.users)) {
    console.log(`The plugin admin page is at http://${settings.ip}:${settings.port}/admin/plugins`);
  } else {
    console.warn("Admin username and password not set in settings.json.  To access admin please uncomment and edit 'users' in settings.json");
  }

  var env = process.env.NODE_ENV || 'development';

  if (env !== 'production') {
    console.warn("Etherpad is running in Development mode.  This mode is slower for users and less secure than production mode.  You should set the NODE_ENV environment variable to production by using: export NODE_ENV=production");
  }
}

exports.restartServer = function () {
  if (server) {
    console.log("Restarting express server");
    server.close();
  }

  var app = express(); // New syntax for express v3

  if (settings.ssl) {
    console.log("SSL -- enabled");
    console.log(`SSL -- server key file: ${settings.ssl.key}`);
    console.log(`SSL -- Certificate Authority's certificate file: ${settings.ssl.cert}`);

    var options = {
      key: fs.readFileSync( settings.ssl.key ),
      cert: fs.readFileSync( settings.ssl.cert )
    };

    if (settings.ssl.ca) {
      options.ca = [];
      for (var i = 0; i < settings.ssl.ca.length; i++) {
        var caFileName = settings.ssl.ca[i];
        options.ca.push(fs.readFileSync(caFileName));
      }
    }

    var https = require('https');
    server = https.createServer(options, app);
  } else {
    var http = require('http');
    server = http.createServer(app);
  }

  app.use(function(req, res, next) {
    // res.header("X-Frame-Options", "deny"); // breaks embedded pads
    if (settings.ssl) {
      // we use SSL
      res.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    // Stop IE going into compatability mode
    // https://github.com/ether/etherpad-lite/issues/2547
    res.header("X-UA-Compatible", "IE=Edge,chrome=1");

    // Enable a strong referrer policy. Same-origin won't drop Referers when
    // loading local resources, but it will drop them when loading foreign resources.
    // It's still a last bastion of referrer security. External URLs should be
    // already marked with rel="noreferer" and user-generated content pages are already
    // marked with <meta name="referrer" content="no-referrer">
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
    // https://github.com/ether/etherpad-lite/pull/3636
    res.header("Referrer-Policy", "same-origin");

    // send git version in the Server response header if exposeVersion is true.
    if (settings.exposeVersion) {
      res.header("Server", serverName);
    }

    next();
  });

  if (settings.trustProxy) {
    /*
     * If 'trust proxy' === true, the client’s IP address in req.ip will be the
     * left-most entry in the X-Forwarded-* header.
     *
     * Source: https://expressjs.com/en/guide/behind-proxies.html
     */
    app.enable('trust proxy');
  }

  hooks.callAll("expressConfigure", {"app": app});
  hooks.callAll("expressCreateServer", {"app": app, "server": server});

  server.listen(settings.port, settings.ip);
}
