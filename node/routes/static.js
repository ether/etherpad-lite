var path = require('path');

module.exports = function(app)
{

  app.get('/static/*', function(req, res)
  {
    var filePath = path.normalize(__dirname + "/../.." +
                                  req.url.replace(/\.\./g, '').split("?")[0]);
    res.sendfile(filePath, { maxAge: app.maxAge });
  });

  //serve pad.html under /p
  app.get('/p/:pad', function(req, res, next)
  {
    var filePath = path.normalize(__dirname + "/../../static/pad.html");
    res.sendfile(filePath, { maxAge: app.maxAge });
  });

  //serve timeslider.html under /p/$padname/timeslider
  app.get('/p/:pad/timeslider', function(req, res, next)
  {
    var filePath = path.normalize(__dirname + "/../../static/timeslider.html");
    res.sendfile(filePath, { maxAge: app.maxAge });
  });

  //serve index.html under /
  app.get('/', function(req, res)
  {
    var filePath = path.normalize(__dirname + "/../../static/index.html");
    res.sendfile(filePath, { maxAge: app.maxAge });
  });

  //serve robots.txt
  app.get('/robots.txt', function(req, res)
  {
    var filePath = path.normalize(__dirname + "/../../static/robots.txt");
    res.sendfile(filePath, { maxAge: app.maxAge });
  });

  //serve favicon.ico
  app.get('/favicon.ico', function(req, res)
  {
    var filePath = path.normalize(__dirname + "/../../static/custom/favicon.ico");
    res.sendfile(filePath, { maxAge: app.maxAge }, function(err)
    {
      //there is no custom favicon, send the default favicon
      if(err)
      {
        filePath = path.normalize(__dirname + "/../../static/favicon.ico");
        res.sendfile(filePath, { maxAge: app.maxAge });
      }
    });
  });
};
