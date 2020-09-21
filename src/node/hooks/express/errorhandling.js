var stats = require('ep_etherpad-lite/node/stats')

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
}
