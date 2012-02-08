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

  //serve timeslider.html under /p/$padname/timeslider
  app.get('/p/:pad/:rev?/export/:type', function(req, res, next)
  {
    var types = ["pdf", "doc", "txt", "html", "odt", "dokuwiki"];
    //send a 404 if we don't support this filetype
    if(types.indexOf(req.params.type) == -1)
    {
      next();
      return;
    }

    //if abiword is disabled, and this is a format we only support with abiword, output a message
    if(app.settings.abiword == null &&
       ["odt", "pdf", "doc"].indexOf(req.params.type) !== -1)
    {
      res.send("Abiword is not enabled at this Etherpad Lite instance. Set the path to Abiword in settings.json to enable this feature");
      return;
    }

    res.header("Access-Control-Allow-Origin", "*");

    hasPadAccess(req, res, function()
    {
      app.exportHandler.doExport(req, res, req.params.pad, req.params.type);
    });
  });

};
