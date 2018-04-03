var os = require("os");
var db = require('../../db/DB');
var stats = require('ep_etherpad-lite/node/stats')


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

  //do the db shutdown
  db.db.doShutdown(function() {
    console.log("db sucessfully closed.");

    process.exit(0);
  });

  setTimeout(function(){
    process.exit(1);
  }, 3000);
}

process.on('uncaughtException', exports.gracefulShutdown);

exports.expressCreateServer = function (hook_name, args, cb) {
  exports.app = args.app;

  // Handle errors
  args.app.use(function(err, req, res, next){
    // if an error occurs Connect will pass it down
    // through these "error-handling" middleware
    // allowing you to respond however you like
    res.status(500).send({ error: 'Sorry, something bad happened!' });
    console.error(err.stack? err.stack : err.toString());
    stats.meter('http500').mark()
  })

  //connect graceful shutdown with sigint and uncaughtexception
  if(os.type().indexOf("Windows") == -1) {
    //sigint is so far not working on windows
    //https://github.com/joyent/node/issues/1553
    process.on('SIGINT', exports.gracefulShutdown);
    // when running as PID1 (e.g. in docker container)
    // allow graceful shutdown on SIGTERM c.f. #3265
    process.on('SIGTERM', exports.gracefulShutdown);
  }
}
