'use strict';

const stats = require('ep_etherpad-lite/node/stats');

/**
 * Express already comes with an error handler that is attached
 * as the last middleware. Within all routes it's possible to call
 * `next(err)` where `err` is an Error object. You can specify
 * `statusCode` and `statusMessage`.
 * For more details see "The default error handler" section on
 * https://expressjs.com/en/guide/error-handling.html
 *
 * This method is only used for metrics
 *
 */
exports.expressCreateServer = (hookName, args, cb) => {
  args.app.use((err, req, res, next) => {
    const status = err.statusCode || err.status;
    stats.meter(`http${status}`).mark();
    next(err);
  });

  return cb();
};
