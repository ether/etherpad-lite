var readOnlyManager = require("../../db/ReadOnlyManager");
var hasPadAccess = require("../../padaccess");
var exporthtml = require("../../utils/ExportHtml");

exports.expressCreateServer = function (hook_name, args, cb) {
  // serve read only pad
  args.app.get('/ro/:id', async function(req, res) {

    // translate the read only pad to a padId
    let padId = await readOnlyManager.getPadId(req.params.id);
    if (padId == null) {
      res.status(404).send('404 - Not Found');
      return;
    }

    // we need that to tell hasPadAcess about the pad
    req.params.pad = padId;

    if (await hasPadAccess(req, res)) {
      // render the html document
      let html = await exporthtml.getPadHTMLDocument(padId, null);
      res.send(html);
    }
  });

}
