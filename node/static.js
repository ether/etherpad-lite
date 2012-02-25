var path = require('path');
var minify = require('./utils/Minify');

exports.expressCreateServer = function (hook_name, args, cb) {
  //serve static files
  args.app.get('/static/js/require-kernel.js', function (req, res, next) {
    res.header("Content-Type","application/javascript; charset: utf-8");
    res.write(minify.requireDefinition());
    res.end();
  });
  args.app.get('/static/*', function(req, res)
  { 
    var filePath = path.normalize(__dirname + "/.." +
				  req.url.replace(/\.\./g, '').split("?")[0]);
    res.sendfile(filePath, { maxAge: exports.maxAge });
  });
}
