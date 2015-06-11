'use strict';
var _ = require('underscore');
var fs = require('fs');
var path = require('path');

var pluginUtils = require('ep_etherpad-lite/static/js/pluginfw/shared');

var PACKAGE_ROOT = path.dirname(require.resolve('ep_etherpad-lite/ep.json'));
var SRC_ROOT = path.normalize(PACKAGE_ROOT + '/static');
console.log('SRC_ROOT', SRC_ROOT);
console.log('PACKAGE_ROOT', PACKAGE_ROOT);

// var TMP_ROOT = SRC_ROOT+'/build';


/******* plugin definitions   ************/

function writePluginsFile(plugins) {


  var clientParts = _(plugins.parts)
    .filter(function(part) {
      return _(part).has('client_hooks')
    });

  var clientPlugins = {};

  _(clientParts).chain()
    .map(function(part) {
      return part.plugin
    })
    .uniq()
    .each(function(name) {
      clientPlugins[name] = _(plugins.plugins[name]).clone();
      delete clientPlugins[name]['package'];
    });

  function processHook(part, fName) {
    //console.log('\n\n\n\n' + fName, part);
    return fName;
  }

  var hooks = pluginUtils.extractHooks(clientParts, "client_hooks", processHook, console.log);

  return;


// var definitions = JSON.stringify({
//   "plugins": clientPlugins,
//   "parts": clientParts
// }, 2, 2);
// console.log(definitions);
}

var pluginDefsPath = path.normalize(PACKAGE_ROOT + '/../var/plugin-definitions.json');
var pluginsDefs = fs.readFileSync(pluginDefsPath, {
  encoding: 'utf8'
});
pluginsDefs = JSON.parse(pluginsDefs);
writePluginsFile(pluginsDefs);

/*** mangle ace to include CSS and JS ***/

//get abs path by module resolver
var aceSrc = require.resolve('ep_etherpad-lite/static/js/ace');

// replacement for Minify.js
var data = fs.readFileSync(aceSrc, {
  encoding: 'utf8'
});

// Find all includes in ace.js and embed them
var founds = data.match(/\$\$INCLUDE_[a-zA-Z_]+\("[^"]*"\)/gi);

data += '\n\n\n\n';
data += '/*----------- AUTO_GENERATED CODE BELOW -----------*/;\n';
data += '\n\n\n\n';
data += 'Ace2Editor.EMBEDED = Ace2Editor.EMBEDED || {};\n';
data += '\n\n\n\n';

// Always include the require kernel.
// founds.push('$$INCLUDE_JS("../static/js/require-kernel.js")');
var RequireKernel = require('etherpad-require-kernel');

// data += 'Ace2Editor.EMBEDED[' + JSON.stringify('../static/js/require-kernel.js') + '] = '
//   + JSON.stringify(RequireKernel.kernelSource) + ';\n';
data += 'Ace2Editor.EMBEDED[' + JSON.stringify('../static/js/require-kernel.js') + '] = '
  + JSON.stringify(' ') + ';\n';


// Request the contents of the included file on the server-side and write
// them into the file.
_.each(founds, function(item) {
  var filename = item.match(/"([^"]*)"/)[1];
  var filePath = path.normalize(SRC_ROOT + '/' + filename);
  var contents = fs.readFileSync(filePath, {
    encoding: 'utf8'
  });
  // console.log(filePath, contents);

  data += 'Ace2Editor.EMBEDED[' + JSON.stringify(filename) + '] = '
    + JSON.stringify(contents) + ';\n';
});

//console.log(data);
var destPath = SRC_ROOT + '/js/__ace_build.js';
fs.writeFileSync(destPath, data, {
  encoding: 'utf8'
});
console.log(aceSrc + ' transformed to ' + destPath);