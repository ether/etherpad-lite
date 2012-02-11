var ERR = require("async-stacktrace");

module.exports = function(app)
{
  var hasPadAccess = require('./preconditions').hasPadAccess(app);

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
