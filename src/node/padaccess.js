var ERR = require("async-stacktrace");
var securityManager = require('./db/SecurityManager');

//checks for padAccess
module.exports = function (req, res, callback) {

  // FIXME: Why is this ever undefined??
  if (req.cookies === undefined) req.cookies = {};

  securityManager.checkAccess(req.params.pad, req.cookies.sessionid, req.cookies.token, req.cookies.password, function(err, accessObj) {
    if(ERR(err, callback)) return;

    //there is access, continue
    if(accessObj.accessStatus == "grant") {
      callback();
    //no access
    } else {
      res.send("403 - Can't touch this", 403);
    }
  });
}
