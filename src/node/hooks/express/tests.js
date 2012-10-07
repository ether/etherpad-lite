var path = require("path");

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/tests/frontend/*', function (req, res) {
    var subPath = req.url.substr("/tests/frontend".length);
    if (subPath == ""){
      subPath = "index.html"
    }
    subPath = subPath.split("?")[0];

    var filePath = path.normalize(__dirname + "/../../../../tests/frontend/")
    filePath += subPath.replace("..", "");

    res.sendfile(filePath);
  });
}