var ERR = require("async-stacktrace");

module.exports = function(app)
{

  var hasPadAccess = require('./preconditions').hasPadAccess(app);

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
