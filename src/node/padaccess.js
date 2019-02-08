var ERR = require("async-stacktrace");
var securityManager = require('./db/SecurityManager');

// checks for padAccess
module.exports = function (req, res, callback) {
  securityManager.checkAccess(req.params.pad, req.cookies.sessionID, req.cookies.token, req.cookies.password, function(err, accessObj) {
    if (ERR(err, callback)) return;

    if (accessObj.accessStatus == "grant") {
      // there is access, continue
      callback();
    } else {
      // no access
      res.status(403).send("403 - Can't touch this");
    }
  });
}
