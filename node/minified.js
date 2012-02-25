var minify = require('./utils/Minify');

exports.expressCreateServer = function (hook_name, args, cb) {
  //serve minified files
  args.app.get('/minified/:filename', minify.minifyJS);
}
