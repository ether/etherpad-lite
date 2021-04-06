'use strict';

const readOnlyManager = require('../../db/ReadOnlyManager');
const hasPadAccess = require('../../padaccess');
const exporthtml = require('../../utils/ExportHtml');

exports.expressCreateServer = (hookName, args, cb) => {
  // serve read only pad
  args.app.get('/ro/:id', async (req, res) => {
    // translate the read only pad to a padId
    const padId = await readOnlyManager.getPadId(req.params.id);
    if (padId == null) {
      res.status(404).send('404 - Not Found');
      return;
    }

    // we need that to tell hasPadAcess about the pad
    req.params.pad = padId;

    if (await hasPadAccess(req, res)) {
      // render the html document
      const html = await exporthtml.getPadHTMLDocument(padId, null);
      res.send(html);
    }
  });
  return cb();
};
