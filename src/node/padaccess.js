'use strict';
const securityManager = require('./db/SecurityManager');

// checks for padAccess
module.exports = async (req, res) => {
  const {session: {user} = {}} = req;
  const accessObj = await securityManager.checkAccess(
      req.params.pad, req.cookies.sessionID, req.cookies.token, user);

  if (accessObj.accessStatus === 'grant') {
    // there is access, continue
    return true;
  } else {
    // no access
    res.status(403).send("403 - Can't touch this");
    return false;
  }
};
