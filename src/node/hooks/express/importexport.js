var hasPadAccess = require("../../padaccess");
var settings = require('../../utils/Settings');
var exportHandler = require('../../handler/ExportHandler');
var importHandler = require('../../handler/ImportHandler');

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/p/:pad/:rev?/export/:type', function(req, res, next) {
    var types = ["pdf", "doc", "txt", "html", "odt", "dokuwiki"];
    //send a 404 if we don't support this filetype
    if (types.indexOf(req.params.type) == -1) {
      next();
      return;
    }

    //if abiword is disabled, and this is a format we only support with abiword, output a message
    if (settings.abiword == null &&
       ["odt", "pdf", "doc"].indexOf(req.params.type) !== -1) {
      res.send("Abiword is not enabled at this Etherpad instance. Set the path to Abiword in settings.json to enable this feature");
      return;
    }

    res.header("Access-Control-Allow-Origin", "*");

    hasPadAccess(req, res, function() {
      exportHandler.doExport(req, res, req.params.pad, req.params.type);
    });
  });

  //handle import requests
  args.app.post('/p/:pad/import', function(req, res, next) {
    hasPadAccess(req, res, function() {
      importHandler.doImport(req, res, req.params.pad);
    });
  });
}
