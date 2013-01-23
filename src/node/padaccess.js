var ERR = require("async-stacktrace");
var securityManager = require('./db/SecurityManager');
var padManager = require("./db/PadManager");

//checks for padAccess
module.exports = function (req, res, callback) {

  // FIXME: Why is this ever undefined??
  if (req.cookies === undefined) req.cookies = {};

  // FIXME: always use httponly session cookies
  var sessionID = null;
  if (padManager.isTeamPad(req.params.pad)) {
    sessionID = req.cookies.sessionid;
  } else {
    sessionID = req.cookies.express_sid;
  }
  securityManager.checkAccess(req.params.pad, sessionID, req.cookies.token, req.cookies.password, function(err, accessObj) {
    if(ERR(err, callback)) return;

    //there is access, continue
    if(accessObj.accessStatus == "grant") {
      callback();
    //no access
    } else {
      res.send(403, "403 - Can't touch this");
    }
  });
}
