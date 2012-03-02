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

var ROOT_DIR = path.normalize(__dirname + "/../../static/");
var TAR_PATH = path.join(__dirname, 'tar.json');
var tar = JSON.parse(fs.readFileSync(TAR_PATH, 'utf8'));

// Rewrite tar to include modules with no extensions and proper rooted paths.
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
exports.minify = function(req, res, next)
{
  var filename = req.params['filename'];

  // No relative paths, especially if they may go up the file hierarchy.
  filename = path.normalize(path.join(ROOT_DIR, filename));
  if (filename.indexOf(ROOT_DIR) == 0) {
    filename = filename.slice(ROOT_DIR.length);
    filename = filename.replace(/\\/g, '/'); // Windows (safe generally?)
  } else {
    res.writeHead(404, {});
    res.end();
    return; 
  }

  // What content type should this be?
  // TODO: This should use a MIME module.
  var contentType;
  if (filename.match(/\.js$/)) {
    contentType = "text/javascript";
  } else if (filename.match(/\.css$/)) {
    contentType = "text/css";
  } else if (filename.match(/\.html$/)) {
    contentType = "text/html";
  } else if (filename.match(/\.txt$/)) {
    contentType = "text/plain";
  } else if (filename.match(/\.png$/)) {
    contentType = "image/png";
  } else if (filename.match(/\.gif$/)) {
    contentType = "image/gif";
  } else if (filename.match(/\.ico$/)) {
    contentType = "image/x-icon";
  } else {
    contentType = "application/octet-stream";
  }

  statFile(filename, function (error, date, exists) {
    if (date) {
      date = new Date(date);
      res.setHeader('last-modified', date.toUTCString());
      res.setHeader('date', (new Date()).toUTCString());
      if (server.maxAge) {
        var expiresDate = new Date((new Date()).getTime()+server.maxAge*1000);
        res.setHeader('expires', expiresDate.toUTCString());
        res.setHeader('cache-control', 'max-age=' + server.maxAge);
      }
    }

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
        res.header("Content-Type", contentType);
        res.writeHead(200, {});
        res.end();
      } else if (req.method == 'GET') {
        getFileCompressed(filename, contentType, function (error, content) {
          if(ERR(error)) return;
          res.header("Content-Type", contentType);
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
}

// Check for the existance of the file and get the last modification date.
function statFile(filename, callback) {
  if (filename == 'js/require-kernel.js') {
    callback(null, requireLastModified(), true);
  } else {
    fs.stat(ROOT_DIR + filename, function (error, stats) {
      if (error) {
        if (error.code == "ENOENT") {
          // Stat the directory instead.
          fs.stat(path.dirname(ROOT_DIR + filename), function (error, stats) {
            if (error) {
              if (error.code == "ENOENT") {
                callback(null, null, false);
              } else {
                callback(error);
              }
            } else {
              callback(null, stats.mtime.getTime(), false);
            }
          });
        } else {
          callback(error);
        }
      } else {
        callback(null, stats.mtime.getTime(), true);
      }
    });
  }
}

// This should be provided by the module, but until then, just use startup
// time.
var _requireLastModified = new Date();
function requireLastModified() {
  return _requireLastModified.toUTCString();
}
function requireDefinition() {
  return 'var require = ' + RequireKernel.kernelSource + ';\n';
}

function getFileCompressed(filename, contentType, callback) {
  getFile(filename, function (error, content) {
    if (error || !content) {
      callback(error, content);
    } else {
      if (settings.minify) {
        if (contentType == 'text/javascript') {
          try {
            content = compressJS([content]);
          } catch (error) {
            // silence
          }
        } else if (contentType == 'text/css') {
          content = compressCSS([content]);
        }
      }
      callback(null, content);
    }
  });
}

function getFile(filename, callback) {
  if (filename == 'js/require-kernel.js') {
    callback(undefined, requireDefinition());
  } else {
    fs.readFile(ROOT_DIR + filename, callback);
  }
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
