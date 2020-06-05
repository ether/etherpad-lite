var path = require('path');
var eejs = require('ep_etherpad-lite/node/eejs');
var toolbar = require("ep_etherpad-lite/node/utils/toolbar");
var hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');
var settings = require('../../utils/Settings');

exports.expressCreateServer = function (hook_name, args, cb) {
  // expose current stats
  args.app.get('/stats', function(req, res) {
    res.json(require('ep_etherpad-lite/node/stats').toJSON())
  })

  //serve index.html under /
  args.app.get('/', function(req, res)
  {
    res.send(eejs.require("ep_etherpad-lite/templates/index.html"));
  });

  //serve javascript.html
  args.app.get('/javascript', function(req, res)
  {
    res.send(eejs.require("ep_etherpad-lite/templates/javascript.html"));
  });


  //serve robots.txt
  args.app.get('/robots.txt', function(req, res)
  {
    var filePath = path.join(settings.root, "src", "static", "skins", settings.skinName, "robots.txt");
    res.sendFile(filePath, function(err)
    {
      //there is no custom favicon, send the default robots.txt which dissallows all
      if(err)
      {
        filePath = path.join(settings.root, "src", "static", "robots.txt");
        res.sendFile(filePath);
      }
    });
  });

  //serve pad.html under /p
  args.app.get('/p/:pad', function(req, res, next)
  {
    // The below might break for pads being rewritten
    var isReadOnly = req.url.indexOf("/p/r.") === 0;

    hooks.callAll("padInitToolbar", {
      toolbar: toolbar,
      isReadOnly: isReadOnly
    });

    res.send(eejs.require("ep_etherpad-lite/templates/pad.html", {
      req: req,
      toolbar: toolbar,
      isReadOnly: isReadOnly
    }));
  });

  //serve timeslider.html under /p/$padname/timeslider
  args.app.get('/p/:pad/timeslider', function(req, res, next)
  {
    hooks.callAll("padInitToolbar", {
      toolbar: toolbar
    });

    res.send(eejs.require("ep_etherpad-lite/templates/timeslider.html", {
      req: req,
      toolbar: toolbar
    }));
  });

  //serve favicon.ico from all path levels except as a pad name
  args.app.get( /\/favicon.ico$/, function(req, res)
  {
    var filePath = path.join(settings.root, "src", "static", "skins", settings.skinName, "favicon.ico");

    res.sendFile(filePath, function(err)
    {
      //there is no custom favicon, send the default favicon
      if(err)
      {
        filePath = path.join(settings.root, "src", "static", "favicon.ico");
        res.sendFile(filePath);
      }
    });
  });


}
