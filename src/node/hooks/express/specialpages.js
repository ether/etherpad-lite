var path = require('path');
var eejs = require('ep_etherpad-lite/node/eejs');

exports.expressCreateServer = function (hook_name, args, cb) {

  //serve index.html under /
  args.app.get('/', function(req, res)
  {
    res.send(eejs.require("ep_etherpad-lite/templates/index.html"));
  });

  //serve robots.txt
  args.app.get('/robots.txt', function(req, res)
  {
    var filePath = path.normalize(__dirname + "/../../../static/custom/robots.txt");
    res.sendfile(filePath, function(err)
    {
      //there is no custom favicon, send the default robots.txt which dissallows all
      if(err)
      {
        filePath = path.normalize(__dirname + "/../../../static/robots.txt");
        res.sendfile(filePath);
      }
    });
  });

  //serve pad.html under /p
  args.app.get('/p/:pad', function(req, res, next)
  {    
    /*if(!!(req.params.pad.match(/[;\/\?:@&=\+\$,{}\\\^\[\]\`\|%<>\*#]/gi))){
      res.send(404, "Such a padname is forbidden");
    }else{*/
      res.send(eejs.require("ep_etherpad-lite/templates/pad.html", {req: req}));
    //}
  });

  //serve timeslider.html under /p/$padname/timeslider
  args.app.get('/p/:pad/timeslider', function(req, res, next)
  {
    res.send(eejs.require("ep_etherpad-lite/templates/timeslider.html", {req: req}));
  });
  args.app.get('/p/:pad/*', function(req, res, next)
  {
    if(req.url.split("/")[3] == "timeslider"){
      //Just a safeguard, sometimes these URLs get messed up and should be
      //actually rerouted to the timeslider instead of an error page.
      res.send(eejs.require("ep_etherpad-lite/templates/timeslider.html", {req: req}));
    }else{
      res.send(404, "Such a padname is forbidden");
    }
  });
  //serve favicon.ico from all path levels except as a pad name
  args.app.get( /\/favicon.ico$/, function(req, res)
  {
    var filePath = path.normalize(__dirname + "/../../../static/custom/favicon.ico");
    res.sendfile(filePath, function(err)
    {
      //there is no custom favicon, send the default favicon
      if(err)
      {
	filePath = path.normalize(__dirname + "/../../../static/favicon.ico");
	res.sendfile(filePath);
      }
    });
  });


}