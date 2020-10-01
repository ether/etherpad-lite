var settings = require('../../utils/Settings');
var socketio = require('socket.io');
var socketIORouter = require("../../handler/SocketIORouter");
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
var webaccess = require("ep_etherpad-lite/node/hooks/express/webaccess");

var padMessageHandler = require("../../handler/PadMessageHandler");

var cookieParser = require('cookie-parser');
var sessionModule = require('express-session');
const util = require('util');

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

  // REQUIRE a signed express-session cookie to be present, then load the session. See
  // http://www.danielbaulig.de/socket-ioexpress for more info. After the session is loaded, ensure
  // that the user has authenticated (if authentication is required).
  //
  // !!!WARNING!!! Requests to /socket.io are NOT subject to the checkAccess middleware in
  // webaccess.js. If this handler fails to check for a signed express-session cookie or fails to
  // check whether the user has authenticated, then any random person on the Internet can read,
  // modify, or create any pad (unless the pad is password protected or an HTTP API session is
  // required).
  const cookieParserFn = util.promisify(cookieParser(webaccess.secret, {}));
  const getSession = util.promisify(args.app.sessionStore.get).bind(args.app.sessionStore);
  io.use(async (socket, next) => {
    const req = socket.request;
    if (!req.headers.cookie) {
      // socketio.js-client on node.js doesn't support cookies (see https://git.io/JU8u9), so the
      // token and express_sid cookies have to be passed via a query parameter for unit tests.
      req.headers.cookie = socket.handshake.query.cookie;
    }
    if (!req.headers.cookie && settings.loadTest) {
      console.warn('bypassing socket.io authentication check due to settings.loadTest');
      return next(null, true);
    }
    try {
      await cookieParserFn(req, {});
      const expressSid = req.signedCookies.express_sid;
      const needAuthn = settings.requireAuthentication;
      if (needAuthn && !expressSid) throw new Error('signed express_sid cookie is required');
      if (expressSid) {
        const session = await getSession(expressSid);
        if (!session) throw new Error('bad session or session has expired');
        req.session = new sessionModule.Session(req, session);
        if (needAuthn && req.session.user == null) throw new Error('authentication required');
      }
    } catch (err) {
      return next(new Error(`access denied: ${err}`), false);
    }
    return next(null, true);
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
}
