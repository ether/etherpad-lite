var log4js = require('log4js');
var socketio = require('socket.io');
var settings = require('../../utils/Settings');
var socketIORouter = require("../../handler/SocketIORouter");
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");

var padMessageHandler = require("../../handler/PadMessageHandler");
var timesliderMessageHandler = require("../../handler/TimesliderMessageHandler");


exports.expressCreateServer = function (hook_name, args, cb) {
  //init socket.io and redirect all requests to the MessageHandler
  var io = socketio.listen(args.app);

  //this is only a workaround to ensure it works with all browers behind a proxy
  //we should remove this when the new socket.io version is more stable
  io.set('transports', ['xhr-polling']);

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
  socketIORouter.addComponent("timeslider", timesliderMessageHandler);

  hooks.callAll("socketio", {"app": args.app, "io": io});
}
