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
var RequireKernel = require('require-kernel');
var server = require('../server');

var ROOT_DIR = path.normalize(__dirname + "/../" );
var JS_DIR = ROOT_DIR + '../static/js/';
var CSS_DIR = ROOT_DIR + '../static/css/';
var TAR_PATH = path.join(__dirname, 'tar.json');
var tar = JSON.parse(fs.readFileSync(TAR_PATH, 'utf8'));

exports.tar = {};
for (var key in tar) {
  exports.tar['/' + key] =
    tar[key].map(function (p) {return '/' + p}).concat(
      tar[key].map(function (p) {return '/' + p.replace(/\.js$/, '')})
    );
}

/**
 * creates the minifed javascript for the given minified name
 * @param req the Express request
 * @param res the Express response
 */
exports.minifyJS = function(req, res, next)
{
  var filename = req.params['filename'];
  res.header("Content-Type","text/javascript");

  lastModifiedDateOf(filename, function (error, date) {
    date = new Date(date);
    res.setHeader('last-modified', date.toUTCString());
    res.setHeader('date', (new Date()).toUTCString());
    if (server.maxAge) {
      var expiresDate = new Date((new Date()).getTime() + server.maxAge*1000);
      res.setHeader('expires', expiresDate.toUTCString());
      res.setHeader('cache-control', 'max-age=' + server.maxAge);
    }

    fileExists(filename, function (error, exists) {
      if (error) {
        res.writeHead(500, {});
        res.end();
      } else if (!exists) {
        res.writeHead(404, {});
        res.end();
      } else if (new Date(req.headers['if-modified-since']) >= date) {
        res.writeHead(304, {});
        res.end();
      } else {
        if (req.method == 'HEAD') {
          res.writeHead(200, {});
          res.end();
        } else if (req.method == 'GET') {
          getFileCompressed(filename, function (error, content) {
            if(ERR(error)) return;
            res.writeHead(200, {});
            res.write(content);
            res.end();
          });
        } else {
          res.writeHead(405, {'allow': 'HEAD, GET'});
          res.end();
        }
      }
    });
  });
}

// find all includes in ace.js and embed them.
function getAceFile(callback) {
  fs.readFile(JS_DIR + 'ace.js', "utf8", function(err, data) {
    if(ERR(err, callback)) return;

    // Find all includes in ace.js and embed them
    var founds = data.match(/\$\$INCLUDE_[a-zA-Z_]+\([a-zA-Z0-9.\/_"-]+\)/gi);
    if (!settings.minify) {
      founds = [];
    }
    founds.push('$$INCLUDE_JS("../static/js/require-kernel.js")');

    data += ';\n';
    data += 'Ace2Editor.EMBEDED = Ace2Editor.EMBEDED || {};\n';

    //go trough all includes
    async.forEach(founds, function (item, callback) {
      var filename = item.match(/"([^"]*)"/)[1];
      var type = item.match(/INCLUDE_([A-Z]+)/)[1];
      var shortFilename =
          (filename.match(/^\.\.\/static\/js\/(.*)$/, '') || [])[1];

      //read the included files
      if (shortFilename) {
        if (shortFilename == 'require-kernel.js') {
          // the kernel isn’t actually on the file system.
          handleEmbed(null, requireDefinition());
        } else {
          var contents = '';
          tarCode(tar[shortFilename] || shortFilename
          , function (content) {
              contents += content;
            }
          , function () {
              handleEmbed(null, contents);
            }
          );
        }
      } else {
        fs.readFile(ROOT_DIR + filename, "utf8", handleEmbed);
      }

      function handleEmbed(error, data_) {
        if (error) {
          return; // Don't bother to include it.
        }
        if (settings.minify) {
          if (type == "JS") {
            try {
              data_ = compressJS([data_]);
            } catch (e) {
              // Ignore, include uncompresseed, which will break in browser.
            }
          } else {
            data_ = compressCSS([data_]);
          }
        }
        data += 'Ace2Editor.EMBEDED[' + JSON.stringify(filename) + '] = '
            + JSON.stringify(data_) + ';\n';
        callback();
      }
    }, function(error) {
      callback(error, data);
    });
  });
}

function lastModifiedDateOf(filename, callback) {
  if (filename == 'ace.js') {
    lastModifiedDateOfEverything(callback);
  } else {
    fs.stat(JS_DIR + filename, function (error, stats) {
      if (error) {
        if (error.code == "ENOENT") { // Stat the directory instead.
          fs.stat(JS_DIR, function (error, stats) {
            if (error) {
              callback(error);
            } else {
              callback(null, stats.mtime.getTime());
            }
          });
        } else {
          callback(error);
        }
      } else {
        callback(null, stats.mtime.getTime());
      }
    });
  }
}
function lastModifiedDateOfEverything(callback) {
  var folders2check = [CSS_DIR, JS_DIR];
  var latestModification = 0;
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
  }, function () {
    callback(null, latestModification);
  });
}

function requireDefinition() {
  return 'var require = ' + RequireKernel.kernelSource + ';\n';
}

function getFileCompressed(filename, callback) {
  getFile(filename, function (error, content) {
    if (error || !content) {
      callback(error, content);
    } else {
      if (settings.minify) {
        try {
          content = compressJS([content])
        } catch (error) {
          // silence
        }
      }
      callback(null, content);
    }
  });
}

function getFile(filename, callback) {
  if (filename == 'ace.js') {
    getAceFile(callback);
  } else if (filename == 'require-kernel.js') {
    callback(undefined, requireDefinition());
  } else {
    fs.readFile(JS_DIR + filename, "utf8", callback);
  }
}

function fileExists(filename, callback) {
  if (filename == 'require-kernel.js') {
    callback(undefined, true);
  } else {
    fs.stat(JS_DIR + filename, function (error, stats) {
      if (error) {
        if (error.code == "ENOENT") {
          callback(undefined, false);
        } else {
          callback(error, undefined);
        }
      } else {
        callback(undefined, stats.isFile());
      }
    });
  }
}

function tarCode(jsFiles, write, callback) {
  write('require.define({');
  var initialEntry = true;
  async.forEach(jsFiles, function (filename, callback){
    getFile(filename, handleFile)

    function handleFile(err, data) {
      if(ERR(err, callback)) return;
      var srcPath = JSON.stringify('/' + filename);
      var srcPathAbbv = JSON.stringify('/' + filename.replace(/\.js$/, ''));
      if (!initialEntry) {
        write('\n,');
      } else {
        initialEntry = false;
      }
      write(srcPath + ': ')
      data = '(function (require, exports, module) {' + data + '})';
      if (settings.minify) {
        write(compressJS([data]));
      } else {
        write(data);
      }
      if (srcPath != srcPathAbbv) {
        write('\n,' + srcPathAbbv + ': null');
      }

      callback();
    }
  }, function () {
    write('});\n');
    callback();
  });
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
