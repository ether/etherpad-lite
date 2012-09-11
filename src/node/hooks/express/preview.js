var hasPadAccess = require("../../padaccess");
var previewHandler = require('../../handler/PreviewHandler');

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/p/:pad/:rev?/preview/:type', function(req, res, next) {
    var types = ['html'];
    //send a 404 if we don't support this filetype
    if (types.indexOf(req.params.type) == -1) {
      next();
      return;
    }

    res.header("Access-Control-Allow-Origin", "*");

    hasPadAccess(req, res, function() {
      previewHandler.doPreview(req, res, req.params.pad, req.params.type);
    });
  });
}
