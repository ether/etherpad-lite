var async = require('async');
var ERR = require('async-stacktrace');

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

  //serve read only pad
  app.get('/ro/:id', function(req, res)
  {
    var html;
    var padId;
    var pad;

    async.series([
      //translate the read only pad to a padId
      function(callback)
      {
        app.readOnlyManager.getPadId(req.params.id, function(err, _padId)
        {
          if(ERR(err, callback)) return;

          padId = _padId;

          //we need that to tell hasPadAcess about the pad
          req.params.pad = padId;

          callback();
        });
      },
      //render the html document
      function(callback)
      {
        //return if the there is no padId
        if(padId == null)
        {
          callback("notfound");
          return;
        }

        hasPadAccess(req, res, function()
        {
          //render the html document
          app.exporthtml.getPadHTMLDocument(padId, null, false, function(err, _html)
          {
            if(ERR(err, callback)) return;
            html = _html;
            callback();
          });
        });
      }
    ], function(err)
    {
      //throw any unexpected error
      if(err && err != "notfound")
        ERR(err);

      if(err == "notfound")
        res.send('404 - Not Found', 404);
      else
        res.send(html);
    });
  });
};
