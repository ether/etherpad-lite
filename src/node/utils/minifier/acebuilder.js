'use strict';
var _ = require('underscore');
var fs = require('fs');
var path = require('path');

var plugins = require('ep_etherpad-lite/static/js/pluginfw/plugins');

var PACKAGE_ROOT = path.dirname(require.resolve('ep_etherpad-lite/ep.json'));
var SRC_ROOT = path.normalize(PACKAGE_ROOT + '/static');
console.log('SRC_ROOT', SRC_ROOT);
console.log('PACKAGE_ROOT', PACKAGE_ROOT);

// var TMP_ROOT = SRC_ROOT+'/build';


//get abs path by module resolver
var aceSrc = require.resolve('ep_etherpad-lite/static/js/ace');

// replacement for Minify.js
fs.readFile(aceSrc, "utf8", function(err, data) {
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
    + JSON.stringify('') + ';\n';


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

});