const stats = require('ep_etherpad-lite/node/stats');

exports.expressCreateServer = function (hook_name, args, cb) {
  exports.app = args.app;

  // Handle errors
  args.app.use((err, req, res, next) => {
    // These are errors from caching_middleware, handle them with a 400
    if (err.toString() === 'cm1') {
      res.status(400).send({error: 'query parameter callback is not require.define'});
    } else if (err.toString() === 'cm2') {
      res.status(400).send({error: 'query parameter v contains the wrong version string'});
    } else if (err.toString() === 'cm3') {
      res.status(400).send({error: 'an unknown query parameter is present'});
    } else {
      // if an error occurs Connect will pass it down
      // through these "error-handling" middleware
      // allowing you to respond however you like
      res.status(500).send({error: 'Sorry, something bad happened!'});
      console.error(err.stack ? err.stack : err.toString());
      stats.meter('http500').mark();
    }

  });

  return cb();
};
