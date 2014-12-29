var settings = require('../../utils/Settings');
var socketio = require('socket.io');
var socketIORouter = require("../../handler/SocketIORouter");
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
var webaccess = require("ep_etherpad-lite/node/hooks/express/webaccess");

var padMessageHandler = require("../../handler/PadMessageHandler");

var connect = require('connect');
 
exports.expressCreateServer = function (hook_name, args, cb) {
  //init socket.io and redirect all requests to the MessageHandler
  // there shouldn't be a browser that isn't compatible to all
  // transports in this list at once
  // e.g. XHR is disabled in IE by default, so in IE it should use jsonp-polling
  var io = socketio({
    transports: settings.socketTransportProtocols
  }).listen(args.server);

  /* Require an express session cookie to be present, and load the
   * session. See http://www.danielbaulig.de/socket-ioexpress for more
   * info */

  io.use(function(socket, accept) {
    var data = socket.request;
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
