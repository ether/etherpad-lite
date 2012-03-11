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

// find all includes in ace.js and embed them.
function getAceFile(callback) {
  fs.readFile(ROOT_DIR + 'js/ace.js', "utf8", function(err, data) {
    if(ERR(err, callback)) return;

    // Find all includes in ace.js and embed them
    var founds = data.match(/\$\$INCLUDE_[a-zA-Z_]+\("[^"]*"\)/gi);
    if (!settings.minify) {
      founds = [];
    }
    // Always include the require kernel.
    founds.push('$$INCLUDE_JS("../static/js/require-kernel.js")');

    data += ';\n';
    data += 'Ace2Editor.EMBEDED = Ace2Editor.EMBEDED || {};\n';

    // Request the contents of the included file on the server-side and write
    // them into the file.
    async.forEach(founds, function (item, callback) {
      var filename = item.match(/"([^"]*)"/)[1];
      var request = require('request');

      var baseURI = 'http://localhost:' + settings.port
      var resourceURI = baseURI + path.normalize(path.join('/static/', filename));
      resourceURI = resourceURI.replace(/\\/g, '/'); // Windows (safe generally?)

      request(resourceURI, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          data += 'Ace2Editor.EMBEDED[' + JSON.stringify(filename) + '] = '
              + JSON.stringify(body || '') + ';\n';
        } else {
          // Silence?
        }
        callback();
      });
    }, function(error) {
      callback(error, data);
    });
  });
}

// Check for the existance of the file and get the last modification date.
function statFile(filename, callback) {
  if (filename == 'js/ace.js') {
    // Sometimes static assets are inlined into this file, so we have to stat
    // everything.
    lastModifiedDateOfEverything(function (error, date) {
      callback(error, date, !error);
    });
  } else if (filename == 'js/require-kernel.js') {
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
function lastModifiedDateOfEverything(callback) {
  var folders2check = [ROOT_DIR + 'js/', ROOT_DIR + 'css/'];
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
  if (filename == 'js/ace.js') {
    getAceFile(callback);
  } else if (filename == 'js/require-kernel.js') {
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
