var hasPadAccess = require("../../padaccess");
var settings = require('../../utils/Settings');
var exportHandler = require('../../handler/ExportHandler');
var importHandler = require('../../handler/ImportHandler');
var padManager = require("../../db/PadManager");

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/p/:pad/:rev?/export/:type', async function(req, res, next) {
    var types = ["pdf", "doc", "txt", "html", "odt", "etherpad"];
    //send a 404 if we don't support this filetype
    if (types.indexOf(req.params.type) == -1) {
      return next();
    }

    // if abiword is disabled, and this is a format we only support with abiword, output a message
    if (settings.exportAvailable() == "no" &&
       ["odt", "pdf", "doc"].indexOf(req.params.type) !== -1) {
      res.send("This export is not enabled at this Etherpad instance. Set the path to Abiword or SOffice in settings.json to enable this feature");
      return;
    }

    res.header("Access-Control-Allow-Origin", "*");

    if (await hasPadAccess(req, res)) {
      console.log('req.params.pad', req.params.pad);
      let exists = await padManager.doesPadExists(req.params.pad);
      if (!exists) {
        return next();
      }

      exportHandler.doExport(req, res, req.params.pad, req.params.type);
    }
  });

  // handle import requests
  args.app.post('/p/:pad/import', async function(req, res, next) {
    if (await hasPadAccess(req, res)) {
      let exists = await padManager.doesPadExists(req.params.pad);
      if (!exists) {
        return next();
      }

      importHandler.doImport(req, res, req.params.pad);
    }
  });
}
