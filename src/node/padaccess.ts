'use strict';
import {checkAccess} from './db/SecurityManager';

// checks for padAccess
export default async (req, res) => {
  const {session: {user} = {}}:SessionSocketModel = req;
  const accessObj = await checkAccess(
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
