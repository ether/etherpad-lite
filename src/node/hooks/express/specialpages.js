var path = require('path');
var async = require('async');
var eejs = require('ep_etherpad-lite/node/eejs');
var toolbar = require("ep_etherpad-lite/node/utils/toolbar");
var hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');

exports.expressCreateServer = function (hook_name, args, cb) {
  // expose current stats
  args.app.get('/stats', function(req, res) {
    res.json(require('ep_etherpad-lite/node/stats').toJSON())
  })

  //serve index.html under /
  args.app.get('/', function(req, res)
  {
    sendPadHeaderFiles(res, function(){
      res.send(eejs.require("ep_etherpad-lite/templates/index.html"));
    });
  });

  //serve robots.txt
  args.app.get('/robots.txt', function(req, res)
  {
    var filePath = path.normalize(__dirname + "/../../../static/custom/robots.txt");
    res.sendFile(filePath, function(err)
    {
      //there is no custom favicon, send the default robots.txt which dissallows all
      if(err)
      {
        filePath = path.normalize(__dirname + "/../../../static/robots.txt");
        res.sendFile(filePath);
      }
    });
  });

  //serve pad.html under /p
  args.app.get('/p/:pad', function(req, res, next)
  {
    sendPadHeaderFiles(res, function(){
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
  });

  //serve timeslider.html under /p/$padname/timeslider
  args.app.get('/p/:pad/timeslider', function(req, res, next)
  {
    sendPadHeaderFiles(res, function(){
      hooks.callAll("padInitToolbar", {
        toolbar: toolbar
      });
    
      res.send(eejs.require("ep_etherpad-lite/templates/timeslider.html", {
        req: req,
        toolbar: toolbar
      }));
    });
  });

  //serve favicon.ico from all path levels except as a pad name
  args.app.get( /\/favicon.ico$/, function(req, res)
  {
    var filePath = path.normalize(__dirname + "/../../../static/custom/favicon.ico");
    res.sendFile(filePath, function(err)
    {
      //there is no custom favicon, send the default favicon
      if(err)
      {
        filePath = path.normalize(__dirname + "/../../../static/favicon.ico");
        res.sendFile(filePath);
      }
    });
  });


}


/*
*
* Here we send the pad Header Files, this is used as "prefetch" which loads the browser up with
* The files it will need when visiting a pad.  The idea is that this makes the users experience faster
* STILL TODO: Extend so plugins can patch into this or so the plugin framework can parse plugin files
* And inject them into this.
*
*/
function sendPadHeaderFiles(res, callback){
  var plugins = hooks.plugins.plugins;
  var pluginPaths = [];
  // Go through each plugin and get the paths
  Object.keys(plugins).forEach(function(key) {
    if(key === "ep_etherpad-lite") return;
    var plugin = plugins[key];
    var client_hooks = plugin.parts[0].client_hooks;
    if(client_hooks){
      Object.keys(client_hooks).forEach(function(k){
        pluginPaths.push(client_hooks[k]);
      });
    }
  });

  // Now we need to uniquify the array so we only have unique paths
  var uniquePaths = pluginPaths.filter(function(item, pos) {
    return pluginPaths.indexOf(item) == pos;
  })

  // Next to join the array into a string so we can add it to the link value
  var uniquePluginString = "";

  for (var i = 0; i < uniquePaths.length; i++) {
    uniquePluginString += "</javascripts/lib/"+uniquePaths[i]+".js>; rel=prefetch\, ";
  }

  // console.log("unique plugin string...", uniquePluginString)

  res.set('Link', uniquePluginString + " <static/js/require-kernel.js>; rel=prefetch\, \
<javascripts/lib/ep_etherpad-lite/static/js/pad.js?callback=require.define>; rel=prefetch\, \
<javascripts/lib/ep_etherpad-lite/static/js/ace2_common.js?callback=require.define>; rel=prefetch\, \
<javascripts/lib/ep_etherpad-lite/static/js/ace2_inner.js?callback=require.define>; rel=prefetch\, \
<javascripts/lib/unorm/lib/unorm.js?callback=require.define>; rel=prefetch\, \
<static/custom/pad.js>; rel=prefetch\, \
<static/js/html10n.js>; rel=prefetch\, \
<static/js/l10n.js>; rel=prefetch\, \
<static/css/pad.css>; rel=prefetch\, \
<static/custom/pad.css>; rel=prefetch\, \
<static/css/iframe_editor.css>; rel=prefetch\, \
<pluginfw/plugin-definitions.json>; rel=prefetch\, \
<locales.json>; rel=prefetch\, \
<static/font/fontawesome-etherpad.woff>; rel=prefetch");
  callback();
}
