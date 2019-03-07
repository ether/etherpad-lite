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

  // ensure there is only one graceful shutdown running
  if (exports.onShutdown) {
    return;
  }

  exports.onShutdown = true;

  console.log("graceful shutdown...");

  // do the db shutdown
  db.doShutdown().then(function() {
    console.log("db sucessfully closed.");

    process.exit(0);
  });

  setTimeout(function() {
    process.exit(1);
  }, 3000);
}

process.on('uncaughtException', exports.gracefulShutdown);

exports.expressCreateServer = function (hook_name, args, cb) {
  exports.app = args.app;

  // Handle errors
  args.app.use(function(err, req, res, next) {
    // if an error occurs Connect will pass it down
    // through these "error-handling" middleware
    // allowing you to respond however you like
    res.status(500).send({ error: 'Sorry, something bad happened!' });
    console.error(err.stack? err.stack : err.toString());
    stats.meter('http500').mark()
  });

  /*
   * Connect graceful shutdown with sigint and uncaught exception
   *
   * Until Etherpad 1.7.5, process.on('SIGTERM') and process.on('SIGINT') were
   * not hooked up under Windows, because old nodejs versions did not support
   * them.
   *
   * According to nodejs 6.x documentation, it is now safe to do so. This
   * allows to gracefully close the DB connection when hitting CTRL+C under
   * Windows, for example.
   *
   * Source: https://nodejs.org/docs/latest-v6.x/api/process.html#process_signal_events
   *
   *   - SIGTERM is not supported on Windows, it can be listened on.
   *   - SIGINT from the terminal is supported on all platforms, and can usually
   *     be generated with <Ctrl>+C (though this may be configurable). It is not
   *     generated when terminal raw mode is enabled.
   */
  process.on('SIGINT', exports.gracefulShutdown);

  // when running as PID1 (e.g. in docker container)
  // allow graceful shutdown on SIGTERM c.f. #3265
  process.on('SIGTERM', exports.gracefulShutdown);
}
