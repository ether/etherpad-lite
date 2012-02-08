var ERR = require("async-stacktrace");

module.exports = function(app)
{
  //TODO put this into module
  //checks for padAccess
  function hasPadAccess(req, res, callback)
  {
    app.securityManager.checkAccess(req.params.pad, req.cookies.sessionid, req.cookies.token, req.cookies.password, function(err, accessObj)
    {
      if(ERR(err, callback)) return;

      //there is access, continue
      if(accessObj.accessStatus == "grant")
      {
        callback();
      }
      //no access
      else
      {
        res.send("403 - Can't touch this", 403);
      }
    });
  }

  //handle import requests
  app.post('/p/:pad/import', function(req, res, next)
  {
    //if abiword is disabled, skip handling this request
    if(app.settings.abiword == null)
    {
      next();
      return;
    }

    hasPadAccess(req, res, function()
    {
      app.importHandler.doImport(req, res, req.params.pad);
    });
  });
};
