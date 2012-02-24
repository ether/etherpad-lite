var path = require('path');

exports.expressServer = function (hook_name, args, cb) {

  //serve index.html under /
  args.app.get('/', function(req, res)
  {
    var filePath = path.normalize(__dirname + "/../static/index.html");
    res.sendfile(filePath, { maxAge: exports.maxAge });
  });

  //serve robots.txt
  args.app.get('/robots.txt', function(req, res)
  {
    var filePath = path.normalize(__dirname + "/../static/robots.txt");
    res.sendfile(filePath, { maxAge: exports.maxAge });
  });

  //serve favicon.ico
  args.app.get('/favicon.ico', function(req, res)
  {
    var filePath = path.normalize(__dirname + "/../static/custom/favicon.ico");
    res.sendfile(filePath, { maxAge: exports.maxAge }, function(err)
    {
      //there is no custom favicon, send the default favicon
      if(err)
      {
	filePath = path.normalize(__dirname + "/../static/favicon.ico");
	res.sendfile(filePath, { maxAge: exports.maxAge });
      }
    });
  });
}