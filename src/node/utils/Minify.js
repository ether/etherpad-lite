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
var StringDecoder = require('string_decoder').StringDecoder;
var CleanCSS = require('clean-css');
var path = require('path');
var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugin_defs");
var RequireKernel = require('etherpad-require-kernel');
var urlutil = require('url');
var mime = require('mime-types')
var Threads = require('threads')
var log4js = require('log4js');

var logger = log4js.getLogger("Minify");

var ROOT_DIR = path.normalize(__dirname + "/../../static/");
var TAR_PATH = path.join(__dirname, 'tar.json');
var tar = JSON.parse(fs.readFileSync(TAR_PATH, 'utf8'));

var threadsPool = Threads.Pool(function () {
  return Threads.spawn(new Threads.Worker("./MinifyWorker"))
}, 2)

var LIBRARY_WHITELIST = [
      'async'
    , 'security'
    , 'tinycon'
    , 'underscore'
    , 'unorm'
    ];

// Rewrite tar to include modules with no extensions and proper rooted paths.
var LIBRARY_PREFIX = 'ep_etherpad-lite/static/js';
exports.tar = {};
function prefixLocalLibraryPath(path) {
  if (path.charAt(0) == '$') {
    return path.slice(1);
  } else {
    return LIBRARY_PREFIX + '/' + path;
  }
}

for (var key in tar) {
  exports.tar[prefixLocalLibraryPath(key)] =
    tar[key].map(prefixLocalLibraryPath).concat(
      tar[key].map(prefixLocalLibraryPath).map(function (p) {
        return p.replace(/\.js$/, '');
      })
    ).concat(
      tar[key].map(prefixLocalLibraryPath).map(function (p) {
        return p.replace(/\.js$/, '') + '/index.js';
      })
    );
}

// What follows is a terrible hack to avoid loop-back within the server.
// TODO: Serve files from another service, or directly from the file system.
function requestURI(url, method, headers, callback) {
  var parsedURL = urlutil.parse(url);

  var status = 500, headers = {}, content = [];

  var mockRequest = {
    url: url
  , method: method
  , params: {filename: parsedURL.path.replace(/^\/static\//, '')}
  , headers: headers
  };
  var mockResponse = {
    writeHead: function (_status, _headers) {
      status = _status;
      for (var header in _headers) {
        if (Object.prototype.hasOwnProperty.call(_headers, header)) {
          headers[header] = _headers[header];
        }
      }
    }
  , setHeader: function (header, value) {
      headers[header.toLowerCase()] = value.toString();
    }
  , header: function (header, value) {
      headers[header.toLowerCase()] = value.toString();
    }
  , write: function (_content) {
    _content && content.push(_content);
    }
  , end: function (_content) {
      _content && content.push(_content);
      callback(status, headers, content.join(''));
    }
  };

  minify(mockRequest, mockResponse);
}
function requestURIs(locations, method, headers, callback) {
  var pendingRequests = locations.length;
  var responses = [];

  function respondFor(i) {
    return function (status, headers, content) {
      responses[i] = [status, headers, content];
      if (--pendingRequests == 0) {
        completed();
      }
    };
  }

  for (var i = 0, ii = locations.length; i < ii; i++) {
    requestURI(locations[i], method, headers, respondFor(i));
  }

  function completed() {
    var statuss = responses.map(function (x) {return x[0];});
    var headerss = responses.map(function (x) {return x[1];});
    var contentss = responses.map(function (x) {return x[2];});
    callback(statuss, headerss, contentss);
  }
}

/**
 * creates the minifed javascript for the given minified name
 * @param req the Express request
 * @param res the Express response
 */
function minify(req, res)
{
  var filename = req.params['filename'];

  // No relative paths, especially if they may go up the file hierarchy.
  filename = path.normalize(path.join(ROOT_DIR, filename));
  filename = filename.replace(/\.\./g, '')

  if (filename.indexOf(ROOT_DIR) == 0) {
    filename = filename.slice(ROOT_DIR.length);
    filename = filename.replace(/\\/g, '/')
  } else {
    res.writeHead(404, {});
    res.end();
    return;
  }

  /* Handle static files for plugins/libraries:
     paths like "plugins/ep_myplugin/static/js/test.js"
     are rewritten into ROOT_PATH_OF_MYPLUGIN/static/js/test.js,
     commonly ETHERPAD_ROOT/node_modules/ep_myplugin/static/js/test.js
  */
  var match = filename.match(/^plugins\/([^\/]+)(\/(?:(static\/.*)|.*))?$/);
  if (match) {
    var library = match[1];
    var libraryPath = match[2] || '';

    if (plugins.plugins[library] && match[3]) {
      var plugin = plugins.plugins[library];
      var pluginPath = plugin.package.realPath;
      filename = path.relative(ROOT_DIR, pluginPath + libraryPath);
      filename = filename.replace(/\\/g, '/'); // windows path fix
    } else if (LIBRARY_WHITELIST.indexOf(library) != -1) {
      // Go straight into node_modules
      // Avoid `require.resolve()`, since 'mustache' and 'mustache/index.js'
      // would end up resolving to logically distinct resources.
      filename = '../node_modules/' + library + libraryPath;
    }
  }

  var contentType = mime.lookup(filename);

  statFile(filename, function (error, date, exists) {
    if (date) {
      date = new Date(date);
      date.setMilliseconds(0);
      res.setHeader('last-modified', date.toUTCString());
      res.setHeader('date', (new Date()).toUTCString());
      if (settings.maxAge !== undefined) {
        var expiresDate = new Date(Date.now()+settings.maxAge*1000);
        res.setHeader('expires', expiresDate.toUTCString());
        res.setHeader('cache-control', 'max-age=' + settings.maxAge);
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
          if(ERR(error, function(){
            res.writeHead(500, {});
            res.end();
          })) return;
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
  }, 3);
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

      // Hostname "invalid.invalid" is a dummy value to allow parsing as a URI.
      var baseURI = 'http://invalid.invalid';
      var resourceURI = baseURI + path.normalize(path.join('/static/', filename));
      resourceURI = resourceURI.replace(/\\/g, '/'); // Windows (safe generally?)

      requestURI(resourceURI, 'GET', {}, function (status, headers, body) {
        var error = !(status == 200 || status == 404);
        if (!error) {
          data += 'Ace2Editor.EMBEDED[' + JSON.stringify(filename) + '] = '
              +  JSON.stringify(status == 200 ? body || '' : null) + ';\n';
        } else {
          console.error(`getAceFile(): error getting ${resourceURI}. Status code: ${status}`);
        }
        callback();
      });
    }, function(error) {
      callback(error, data);
    });
  });
}

// Check for the existance of the file and get the last modification date.
function statFile(filename, callback, dirStatLimit) {
  /*
   * The only external call to this function provides an explicit value for
   * dirStatLimit: this check could be removed.
   */
  if (typeof dirStatLimit === 'undefined') {
    dirStatLimit = 3;
  }

  if (dirStatLimit < 1 || filename == '' || filename == '/') {
    callback(null, null, false);
  } else if (filename == 'js/ace.js') {
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
          statFile(path.dirname(filename), function (error, date, exists) {
            callback(error, date, false);
          }, dirStatLimit-1);
        } else {
          callback(error);
        }
      } else if (stats.isFile()) {
        callback(null, stats.mtime.getTime(), true);
      } else {
        callback(null, stats.mtime.getTime(), false);
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
    if (error || !content || !settings.minify) {
      callback(error, content);
    } else if (contentType == 'text/javascript') {
      threadsPool.queue(async ({ compressJS }) => {
        try {
          logger.info('Compress JS file %s.', filename)

          content = content.toString();
          const compressResult = await compressJS(content);

          if (compressResult.error) {
            console.error(`Error compressing JS (${filename}) using terser`, compressResult.error);
          } else {
            content = compressResult.code.toString(); // Convert content obj code to string
          }
        } catch (error) {
          console.error(`getFile() returned an error in getFileCompressed(${filename}, ${contentType}): ${error}`);
        }

        callback(null, content);
      })
    } else if (contentType == 'text/css') {
      threadsPool.queue(async ({ compressCSS }) => {
        try {
          logger.info('Compress CSS file %s.', filename)

          content = await compressCSS(filename, ROOT_DIR);
        } catch (error) {
          console.error(`CleanCSS.minify() returned an error on ${filename}: ${error}`);
        }

        callback(null, content);
      })
    } else {
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

exports.minify = minify;

exports.requestURI = requestURI;
exports.requestURIs = requestURIs;
