const assert = require('assert').strict;
var hasPadAccess = require("../../padaccess");
var settings = require('../../utils/Settings');
var exportHandler = require('../../handler/ExportHandler');
var importHandler = require('../../handler/ImportHandler');
var padManager = require("../../db/PadManager");
var readOnlyManager = require("../../db/ReadOnlyManager");
var authorManager = require("../../db/AuthorManager");
const rateLimit = require("express-rate-limit");
const securityManager = require("../../db/SecurityManager");
const webaccess = require("./webaccess");

settings.importExportRateLimiting.onLimitReached = function(req, res, options) {
  // when the rate limiter triggers, write a warning in the logs
  console.warn(`Import/Export rate limiter triggered on "${req.originalUrl}" for IP address ${req.ip}`);
}

var limiter = rateLimit(settings.importExportRateLimiting);

exports.expressCreateServer = function (hook_name, args, cb) {

  // handle export requests
  args.app.use('/p/:pad/:rev?/export/:type', limiter);
  args.app.get('/p/:pad/:rev?/export/:type', async function(req, res, next) {
    var types = ["pdf", "doc", "txt", "html", "odt", "etherpad"];
    //send a 404 if we don't support this filetype
    if (types.indexOf(req.params.type) == -1) {
      return next();
    }

    // if abiword is disabled, and this is a format we only support with abiword, output a message
    if (settings.exportAvailable() == "no" &&
       ["odt", "pdf", "doc"].indexOf(req.params.type) !== -1) {
      console.error(`Impossible to export pad "${req.params.pad}" in ${req.params.type} format. There is no converter configured`);

      // ACHTUNG: do not include req.params.type in res.send() because there is no HTML escaping and it would lead to an XSS
      res.send("This export is not enabled at this Etherpad instance. Set the path to Abiword or soffice (LibreOffice) in settings.json to enable this feature");
      return;
    }

    res.header("Access-Control-Allow-Origin", "*");

    if (await hasPadAccess(req, res)) {
      let padId = req.params.pad;

      let readOnlyId = null;
      if (readOnlyManager.isReadOnlyId(padId)) {
        readOnlyId = padId;
        padId = await readOnlyManager.getPadId(readOnlyId);
      }

      let exists = await padManager.doesPadExists(padId);
      if (!exists) {
        console.warn(`Someone tried to export a pad that doesn't exist (${padId})`);
        return next();
      }

      console.log(`Exporting pad "${req.params.pad}" in ${req.params.type} format`);
      exportHandler.doExport(req, res, padId, readOnlyId, req.params.type);
    }
  });

  // handle import requests
  args.app.use('/p/:pad/import', limiter);
  args.app.post('/p/:pad/import', async function(req, res, next) {
    const {session: {user} = {}} = req;
    const {accessStatus} = await securityManager.checkAccess(
        req.params.pad, req.cookies.sessionID, req.cookies.token, user);
    if (accessStatus !== 'grant' || !webaccess.userCanModify(req.params.pad, req)) {
      return res.status(403).send('Forbidden');
    }
    await importHandler.doImport(req, res, req.params.pad);
  });

  return cb();
}
