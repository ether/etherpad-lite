/**
 * This Module manages all /minified/* requests. It controls the 
 * minification && compression of Javascript and CSS. 
 */ 

/*
 * 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var ERR = require("async-stacktrace");
var settings = require('./Settings');
var async = require('async');
var fs = require('fs');
var cleanCSS = require('clean-css');
var jsp = require("uglify-js").parser;
var pro = require("uglify-js").uglify;
var path = require('path');
var Buffer = require('buffer').Buffer;
var zlib = require('zlib');
var RequireKernel = require('require-kernel');
var server = require('../server');
var os = require('os');

var ROOT_DIR = path.normalize(__dirname + "/../" );
var JS_DIR = ROOT_DIR + '../static/js/';
var CSS_DIR = ROOT_DIR + '../static/css/';
var CACHE_DIR = ROOT_DIR + '../var/';
var TAR_PATH = path.join(__dirname, 'tar.json');
var tar = JSON.parse(fs.readFileSync(TAR_PATH, 'utf8'));

/**
 * creates the minifed javascript for the given minified name
 * @param req the Express request
 * @param res the Express response
 */
exports.minifyJS = function(req, res, next)
{
  var jsFilename = req.params['filename'];
  
  //choose the js files we need
  var jsFiles = undefined;
  if (Object.prototype.hasOwnProperty.call(tar, jsFilename)) {
    jsFiles = tar[jsFilename];
    _handle(req, res, jsFilename, jsFiles)
  } else {
    // Not in tar list, but try anyways, if it fails, pass to `next`.
    jsFiles = [jsFilename];
    fs.stat(JS_DIR + jsFilename, function (error, stats) {
      if (error || !stats.isFile()) {
        next();
      } else {
        _handle(req, res, jsFilename, jsFiles);
      }
    });
  }
}

function _handle(req, res, jsFilename, jsFiles) {
  res.header("Content-Type","text/javascript");
  
  //minifying is enabled
  if(settings.minify)
  {
    var fileValues = {};
    var embeds = {};
    var latestModification = 0;
    
    async.series([
      //find out the highest modification date
      function(callback)
      {        
        var folders2check = [CSS_DIR, JS_DIR];
        
        //go trough this two folders
        async.forEach(folders2check, function(path, callback)
        {
          //read the files in the folder
          fs.readdir(path, function(err, files)
          {
            if(ERR(err, callback)) return;
            
            //we wanna check the directory itself for changes too
            files.push(".");
            
            //go trough all files in this folder
            async.forEach(files, function(filename, callback) 
            {
              //get the stat data of this file
              fs.stat(path + "/" + filename, function(err, stats)
              {
                if(ERR(err, callback)) return;
              
                //get the modification time
                var modificationTime = stats.mtime.getTime();
              
                //compare the modification time to the highest found
                if(modificationTime > latestModification)
                {
                  latestModification = modificationTime;
                }
                
                callback();
              });
            }, callback);
          });
        }, callback);
      },
      function(callback)
      {
        //check the modification time of the minified js
        fs.stat(CACHE_DIR + "/minified_" + jsFilename, function(err, stats)
        {
          if(err && err.code != "ENOENT")
          {
            ERR(err, callback);
            return;
          }
        
          //there is no minfied file or there new changes since this file was generated, so continue generating this file
          if((err && err.code == "ENOENT") || stats.mtime.getTime() < latestModification)
          {
            callback();
          }
          //the minified file is still up to date, stop minifying
          else
          {
            callback("stop");
          }
        });
      }, 
      //load all js files
      function (callback)
      {
        async.forEach(jsFiles, function (item, callback)
        {
          fs.readFile(JS_DIR + item, "utf-8", function(err, data)
          {            
            if(ERR(err, callback)) return;
            fileValues[item] = data;
            callback();
          });
        }, callback);
      },
      //find all includes in ace.js and embed them 
      function(callback)
      {        
        //if this is not the creation of pad.js, skip this part
        if(jsFilename != "pad.js")
        {
          callback();
          return;
        }
      
        var founds = fileValues["ace.js"].match(/\$\$INCLUDE_[a-zA-Z_]+\([a-zA-Z0-9.\/_"-]+\)/gi);
        
        //go trough all includes
        async.forEach(founds, function (item, callback)
        {
          var filename = item.match(/"[^"]*"/g)[0].substr(1);
          filename = filename.substr(0,filename.length-1);
        
          var type = item.match(/INCLUDE_[A-Z]+/g)[0].substr("INCLUDE_".length);
        
          //read the included file
          var shortFilename = filename.replace(/^..\/static\/js\//, '');
          if (shortFilename == 'require-kernel.js') {
            // the kernel isn’t actually on the file system.
            handleEmbed(null, requireDefinition());
          } else {
            fs.readFile(ROOT_DIR + filename, "utf-8", handleEmbed);
          }
          function handleEmbed(err, data)
          {         
            if(ERR(err, callback)) return;

            if(type == "JS")
            {
              if (shortFilename == 'require-kernel.js') {
                embeds[filename] = compressJS([data]);
              } else {
                embeds[filename] = compressJS([isolateJS(data, shortFilename)]);
              }
            }
            else
            {
              embeds[filename] = compressCSS([data]);
            }
            callback();
          }
        }, function(err)
        {
          if(ERR(err, callback)) return;

          fileValues["ace.js"] += ';\n'
          fileValues["ace.js"] +=
              'Ace2Editor.EMBEDED = Ace2Editor.EMBED || {};\n'
          for (var filename in embeds)
          {
            fileValues["ace.js"] +=
                'Ace2Editor.EMBEDED[' + JSON.stringify(filename) + '] = '
              + JSON.stringify(embeds[filename]) + ';\n';
          }

          callback();
        });
      },
      //put all together and write it into a file
      function(callback)
      {
        //minify all javascript files to one
        var values = [];
        tarCode(jsFiles, fileValues, function (content) {values.push(content)});
        var result = compressJS(values);
        
        async.parallel([
          //write the results plain in a file
          function(callback)
          {
            fs.writeFile(CACHE_DIR + "minified_" + jsFilename, result, "utf8", callback);
          },
          //write the results compressed in a file
          function(callback)
          {
            zlib.gzip(result, function(err, compressedResult){
              //weird gzip bug that returns 0 instead of null if everything is ok
              err = err === 0 ? null : err;
            
              if(ERR(err, callback)) return;
              
              fs.writeFile(CACHE_DIR + "minified_" + jsFilename + ".gz", compressedResult, callback);
            });
          }
        ],callback);
      }
    ], function(err)
    {
      if(err && err != "stop")
      {
        if(ERR(err)) return;
      }
      
      //check if gzip is supported by this browser
      var gzipSupport = req.header('Accept-Encoding', '').indexOf('gzip') != -1;
      
      var pathStr;
      if(gzipSupport && os.type().indexOf("Windows") == -1)
      {
        pathStr = path.normalize(CACHE_DIR + "minified_" + jsFilename + ".gz");
        res.header('Content-Encoding', 'gzip');
      }
      else
      {
        pathStr = path.normalize(CACHE_DIR + "minified_" + jsFilename );
      }
      
      res.sendfile(pathStr, { maxAge: server.maxAge });
    })
  }
  //minifying is disabled, so put the files together in one file
  else
  {
    var fileValues = {};
  
    //read all js files
    async.forEach(jsFiles, function (item, callback)
    {
      fs.readFile(JS_DIR + item, "utf-8", function(err, data)
      {          
        if(ERR(err, callback)) return;  
        fileValues[item] = data;
        callback();
      });
    }, 
    //send all files together
    function(err)
    {
      if(ERR(err)) return;
      
      tarCode(jsFiles, fileValues, function (content) {res.write(content)});
      
      res.end();
    });
  }
}

exports.requireDefinition = requireDefinition;
function requireDefinition() {
  return 'var require = ' + RequireKernel.kernelSource + ';\n';
}

function tarCode(filesInOrder, files, write) {
  for(var i = 0, ii = filesInOrder.length; i < filesInOrder.length; i++) {
    var filename = filesInOrder[i];
    write("\n\n\n/*** File: static/js/" + filename + " ***/\n\n\n");
    write(isolateJS(files[filename], filename));
  }

  for(var i = 0, ii = filesInOrder.length; i < filesInOrder.length; i++) {
    var filename = filesInOrder[i];
    write('require(' + JSON.stringify('/' + filename.replace(/^\/+/, '')) + ');\n');
  }
}

// Wrap the following code in a self executing function and assign exports to
// global. This is a first step towards removing symbols from the global scope.
// exports is global and require is a function that returns global.
function isolateJS(code, filename) {
  var srcPath = JSON.stringify('/' + filename);
  var srcPathAbbv = JSON.stringify('/' + filename.replace(/\.js$/, ''));
  return 'require.define({'
    + srcPath + ': '
      + 'function (require, exports, module) {' + code + '}'
    + (srcPath != srcPathAbbv ? '\n,' + srcPathAbbv + ': null' : '')
    + '});\n';
}

function compressJS(values)
{
  var complete = values.join("\n");
  var ast = jsp.parse(complete); // parse code and get the initial AST
  ast = pro.ast_mangle(ast); // get a new AST with mangled names
  ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
  return pro.gen_code(ast); // compressed code here
}

function compressCSS(values)
{
  var complete = values.join("\n");
  return cleanCSS.process(complete);
}
