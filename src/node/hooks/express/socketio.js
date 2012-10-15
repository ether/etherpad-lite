var log4js = require('log4js');
var socketio = require('socket.io');
var settings = require('../../utils/Settings');
var socketIORouter = require("../../handler/SocketIORouter");
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");

var padMessageHandler = require("../../handler/PadMessageHandler");

var connect = require('connect');
 
exports.expressCreateServer = function (hook_name, args, cb) {
  //init socket.io and redirect all requests to the MessageHandler
  var io = socketio.listen(args.app);

  /* Require an express session cookie to be present, and load the
   * session. See http://www.danielbaulig.de/socket-ioexpress for more
   * info */
  io.set('authorization', function (data, accept) {
    if (!data.headers.cookie) return accept('No session cookie transmitted.', false);
    data.cookie = connect.utils.parseCookie(data.headers.cookie);
    data.sessionID = data.cookie.express_sid;
    args.app.sessionStore.get(data.sessionID, function (err, session) {
      if (err || !session) return accept('Bad session / session has expired', false);
      data.session = new connect.middleware.session.Session(data, session);
      accept(null, true);
    });
  });

  // the following has been successfully tested with the following browsers 
  // works also behind reverse proxy
  // Firefox 14.0.1
  // IE8 with Native XMLHTTP support
  // IE8 without Native XMLHTTP support
  // Chrome 21.0.1180.79
  io.set('transports', ['jsonp-polling']);

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

  hooks.callAll("socketio", {"app": args.app, "io": io});
}
