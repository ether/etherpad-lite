var log4js = require('log4js');
var socketio = require('socket.io');
var settings = require('../../utils/Settings');
var socketIORouter = require("../../handler/SocketIORouter");
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
var webaccess = require("ep_etherpad-lite/node/hooks/express/webaccess");

var padMessageHandler = require("../../handler/PadMessageHandler");

var connect = require('connect');
 
exports.expressCreateServer = function (hook_name, args, cb) {
  //init socket.io and redirect all requests to the MessageHandler
  var io = socketio.listen(args.server);

  /* Require an express session cookie to be present, and load the
   * session. See http://www.danielbaulig.de/socket-ioexpress for more
   * info */
  io.set('authorization', function (data, accept) {
    if (!data.headers.cookie) return accept('No session cookie transmitted.', false);

    // Use connect's cookie parser, because it knows how to parse signed cookies
    connect.cookieParser(webaccess.secret)(data, {}, function(err){
      if(err) {
        console.error(err);
        accept("Couldn't parse request cookies. ", false);
        return;
      }

      data.sessionID = data.signedCookies.express_sid;
      args.app.sessionStore.get(data.sessionID, function (err, session) {
        if (err || !session) return accept('Bad session / session has expired', false);
        data.session = new connect.middleware.session.Session(data, session);
        accept(null, true);
      });
    });
  });

  // there shouldn't be a browser that isn't compatible to all 
  // transports in this list at once
  // e.g. XHR is disabled in IE by default, so in IE it should use jsonp-polling
  io.set('transports', settings.socketTransportProtocols );

  var socketIOLogger = log4js.getLogger("socket.io");
  io.set('logger', {
    debug: function (str)
    {
      socketIOLogger.debug.apply(socketIOLogger, arguments);
    }, 
    info: function (str)
    {
      socketIOLogger.info.apply(socketIOLogger, arguments);
    },
    warn: function (str)
    {
      socketIOLogger.warn.apply(socketIOLogger, arguments);
    },
    error: function (str)
    {
      socketIOLogger.error.apply(socketIOLogger, arguments);
    },
  });

  //minify socket.io javascript
  if(settings.minify)
    io.enable('browser client minification');

  //Initalize the Socket.IO Router
  socketIORouter.setSocketIO(io);
  socketIORouter.addComponent("pad", padMessageHandler);

  hooks.callAll("socketio", {"app": args.app, "io": io, "server": args.server});
}
