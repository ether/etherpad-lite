var os = require("os");
var db = require('../../db/DB');


exports.onShutdown = false;
exports.gracefulShutdown = function(err) {
  if(err && err.stack) {
    console.error(err.stack);
  } else if(err) {
    console.error(err);
  }

  //ensure there is only one graceful shutdown running
  if(exports.onShutdown) return;
  exports.onShutdown = true;

  console.log("graceful shutdown...");

  //stop the http server
  exports.app.close();

  //do the db shutdown
  db.db.doShutdown(function() {
    console.log("db sucessfully closed.");

    process.exit(0);
  });

  setTimeout(function(){
    process.exit(1);
  }, 3000);
}


exports.expressCreateServer = function (hook_name, args, cb) {
  exports.app = args.app;

  args.app.error(function(err, req, res, next){
    res.send(500);
    console.error(err.stack ? err.stack : err.toString());
    exports.gracefulShutdown();
  });

  //connect graceful shutdown with sigint and uncaughtexception
  if(os.type().indexOf("Windows") == -1) {
    //sigint is so far not working on windows
    //https://github.com/joyent/node/issues/1553
    process.on('SIGINT', exports.gracefulShutdown);
  }

  process.on('uncaughtException', exports.gracefulShutdown);
}
