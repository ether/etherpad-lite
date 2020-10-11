const express = require("../express");
const proxyaddr = require('proxy-addr');
var settings = require('../../utils/Settings');
var socketio = require('socket.io');
var socketIORouter = require("../../handler/SocketIORouter");
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");

var padMessageHandler = require("../../handler/PadMessageHandler");

exports.expressCreateServer = function (hook_name, args, cb) {
  //init socket.io and redirect all requests to the MessageHandler
  // there shouldn't be a browser that isn't compatible to all
  // transports in this list at once
  // e.g. XHR is disabled in IE by default, so in IE it should use jsonp-polling
  var io = socketio({
    transports: settings.socketTransportProtocols
  }).listen(args.server, {
    /*
     * Do not set the "io" cookie.
     *
     * The "io" cookie is created by socket.io, and its purpose is to offer an
     * handle to perform load balancing with session stickiness when the library
     * falls back to long polling or below.
     *
     * In Etherpad's case, if an operator needs to load balance, he can use the
     * "express_sid" cookie, and thus "io" is of no use.
     *
     * Moreover, socket.io API does not offer a way of setting the "secure" flag
     * on it, and thus is a liability.
     *
     * Let's simply nuke "io".
     *
     * references:
     *   https://socket.io/docs/using-multiple-nodes/#Sticky-load-balancing
     *   https://github.com/socketio/socket.io/issues/2276#issuecomment-147184662 (not totally true, actually, see above)
     */
    cookie: false,
  });

  io.use((socket, next) => {
    const req = socket.request;
    // Express sets req.ip but socket.io does not. Replicate Express's behavior here.
    if (req.ip == null) {
      if (settings.trustProxy) {
        req.ip = proxyaddr(req, args.app.get('trust proxy fn'));
      } else {
        req.ip = socket.handshake.address;
      }
    }
    if (!req.headers.cookie) {
      // socketio.js-client on node.js doesn't support cookies (see https://git.io/JU8u9), so the
      // token and express_sid cookies have to be passed via a query parameter for unit tests.
      req.headers.cookie = socket.handshake.query.cookie;
    }
    // See: https://socket.io/docs/faq/#Usage-with-express-session
    express.sessionMiddleware(req, {}, next);
  });

  // var socketIOLogger = log4js.getLogger("socket.io");
  // Debug logging now has to be set at an environment level, this is stupid.
  // https://github.com/Automattic/socket.io/wiki/Migrating-to-1.0
  // This debug logging environment is set in Settings.js

  //minify socket.io javascript
  // Due to a shitty decision by the SocketIO team minification is
  // no longer available, details available at:
  // http://stackoverflow.com/questions/23981741/minify-socket-io-socket-io-js-with-1-0
  // if(settings.minify) io.enable('browser client minification');

  //Initalize the Socket.IO Router
  socketIORouter.setSocketIO(io);
  socketIORouter.addComponent("pad", padMessageHandler);

  hooks.callAll("socketio", {"app": args.app, "io": io, "server": args.server});

  return cb();
}
