const assert = require('assert').strict;
var hasPadAccess = require("../../padaccess");
var settings = require('../../utils/Settings');
var exportHandler = require('../../handler/ExportHandler');
var importHandler = require('../../handler/ImportHandler');
var padManager = require("../../db/PadManager");
var authorManager = require("../../db/AuthorManager");
const rateLimit = require("express-rate-limit");
const securityManager = require("../../db/SecurityManager");

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
      let exists = await padManager.doesPadExists(req.params.pad);
      if (!exists) {
        console.warn(`Someone tried to export a pad that doesn't exist (${req.params.pad})`);
        return next();
      }

      console.log(`Exporting pad "${req.params.pad}" in ${req.params.type} format`);
      exportHandler.doExport(req, res, req.params.pad, req.params.type);
    }
  });

  // handle import requests
  args.app.use('/p/:pad/import', limiter);
  args.app.post('/p/:pad/import', async function(req, res, next) {
    if (!(await padManager.doesPadExists(req.params.pad))) {
      console.warn(`Someone tried to import into a pad that doesn't exist (${req.params.pad})`);
      return next();
    }

    const {accessStatus, authorID} = await securityManager.checkAccess(
      req.params.pad, req.cookies.sessionID, req.cookies.token, req.cookies.password);
    if (accessStatus !== 'grant') return res.status(403).send('Forbidden');
    assert(authorID);

    /*
     * Starting from Etherpad 1.8.3 onwards, importing into a pad is allowed
     * only if a user has his browser opened and connected to the pad (i.e. a
     * Socket.IO session is estabilished for him) and he has already
     * contributed to that specific pad.
     *
     * Note that this does not have anything to do with the "session", used
     * for logging into "group pads". That kind of session is not needed here.
     *
     * This behaviour does not apply to API requests, only to /p/$PAD$/import
     *
     * See: https://github.com/ether/etherpad-lite/pull/3833#discussion_r407490205
     */
    if (!settings.allowAnyoneToImport) {
      const authorsPads = await authorManager.listPadsOfAuthor(authorID);
      if (!authorsPads) {
        console.warn(`Unable to import file into "${req.params.pad}". Author "${authorID}" exists but he never contributed to any pad`);
        return next();
      }
      if (authorsPads.padIDs.indexOf(req.params.pad) === -1) {
        console.warn(`Unable to import file into "${req.params.pad}". Author "${authorID}" exists but he never contributed to this pad`);
        return next();
      }
    }

    importHandler.doImport(req, res, req.params.pad);
  });
}
