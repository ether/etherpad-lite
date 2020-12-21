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

const ERR = require('async-stacktrace');
const settings = require('./Settings');
const async = require('async');
const fs = require('fs');
const StringDecoder = require('string_decoder').StringDecoder;
const CleanCSS = require('clean-css');
const path = require('path');
const plugins = require('ep_etherpad-lite/static/js/pluginfw/plugin_defs');
const RequireKernel = require('etherpad-require-kernel');
const urlutil = require('url');
const mime = require('mime-types');
const Threads = require('threads');
const log4js = require('log4js');

const logger = log4js.getLogger('Minify');

const ROOT_DIR = path.normalize(`${__dirname}/../../static/`);
const TAR_PATH = path.join(__dirname, 'tar.json');
const tar = JSON.parse(fs.readFileSync(TAR_PATH, 'utf8'));

const threadsPool = Threads.Pool(() => Threads.spawn(new Threads.Worker('./MinifyWorker')), 2);

const LIBRARY_WHITELIST = [
  'async',
  'js-cookie',
  'security',
  'tinycon',
  'underscore',
  'unorm',
];

// Rewrite tar to include modules with no extensions and proper rooted paths.
const LIBRARY_PREFIX = 'ep_etherpad-lite/static/js';
exports.tar = {};
function prefixLocalLibraryPath(path) {
  if (path.charAt(0) == '$') {
    return path.slice(1);
  } else {
    return `${LIBRARY_PREFIX}/${path}`;
  }
}

for (const key in tar) {
  exports.tar[prefixLocalLibraryPath(key)] =
    tar[key].map(prefixLocalLibraryPath).concat(
        tar[key].map(prefixLocalLibraryPath).map((p) => p.replace(/\.js$/, ''))
    ).concat(
        tar[key].map(prefixLocalLibraryPath).map((p) => `${p.replace(/\.js$/, '')}/index.js`)
    );
}

// What follows is a terrible hack to avoid loop-back within the server.
// TODO: Serve files from another service, or directly from the file system.
function requestURI(url, method, headers, callback) {
  const parsedURL = urlutil.parse(url);

  let status = 500; var headers = {}; const
    content = [];

  const mockRequest = {
    url,
    method,
    params: {filename: parsedURL.path.replace(/^\/static\//, '')},
    headers,
  };
  const mockResponse = {
    writeHead(_status, _headers) {
      status = _status;
      for (const header in _headers) {
        if (Object.prototype.hasOwnProperty.call(_headers, header)) {
          headers[header] = _headers[header];
        }
      }
    },
    setHeader(header, value) {
      headers[header.toLowerCase()] = value.toString();
    },
    header(header, value) {
      headers[header.toLowerCase()] = value.toString();
    },
    write(_content) {
      _content && content.push(_content);
    },
    end(_content) {
      _content && content.push(_content);
      callback(status, headers, content.join(''));
    },
  };

  minify(mockRequest, mockResponse);
}
function requestURIs(locations, method, headers, callback) {
  let pendingRequests = locations.length;
  const responses = [];

  function respondFor(i) {
    return function (status, headers, content) {
      responses[i] = [status, headers, content];
      if (--pendingRequests == 0) {
        completed();
      }
    };
  }

  for (let i = 0, ii = locations.length; i < ii; i++) {
    requestURI(locations[i], method, headers, respondFor(i));
  }

  function completed() {
    const statuss = responses.map((x) => x[0]);
    const headerss = responses.map((x) => x[1]);
    const contentss = responses.map((x) => x[2]);
    callback(statuss, headerss, contentss);
  }
}

/**
 * creates the minifed javascript for the given minified name
 * @param req the Express request
 * @param res the Express response
 */
function minify(req, res) {
  let filename = req.params.filename;

  // No relative paths, especially if they may go up the file hierarchy.
  filename = path.normalize(path.join(ROOT_DIR, filename));
  filename = filename.replace(/\.\./g, '');

  if (filename.indexOf(ROOT_DIR) == 0) {
    filename = filename.slice(ROOT_DIR.length);
    filename = filename.replace(/\\/g, '/');
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
  const match = filename.match(/^plugins\/([^\/]+)(\/(?:(static\/.*)|.*))?$/);
  if (match) {
    const library = match[1];
    const libraryPath = match[2] || '';

    if (plugins.plugins[library] && match[3]) {
      const plugin = plugins.plugins[library];
      const pluginPath = plugin.package.realPath;
      filename = path.relative(ROOT_DIR, pluginPath + libraryPath);
      filename = filename.replace(/\\/g, '/'); // windows path fix
    } else if (LIBRARY_WHITELIST.indexOf(library) != -1) {
      // Go straight into node_modules
      // Avoid `require.resolve()`, since 'mustache' and 'mustache/index.js'
      // would end up resolving to logically distinct resources.
      filename = `../node_modules/${library}${libraryPath}`;
    }
  }

  const contentType = mime.lookup(filename);

  statFile(filename, (error, date, exists) => {
    if (date) {
      date = new Date(date);
      date.setMilliseconds(0);
      res.setHeader('last-modified', date.toUTCString());
      res.setHeader('date', (new Date()).toUTCString());
      if (settings.maxAge !== undefined) {
        const expiresDate = new Date(Date.now() + settings.maxAge * 1000);
        res.setHeader('expires', expiresDate.toUTCString());
        res.setHeader('cache-control', `max-age=${settings.maxAge}`);
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
    } else if (req.method == 'HEAD') {
      res.header('Content-Type', contentType);
      res.writeHead(200, {});
      res.end();
    } else if (req.method == 'GET') {
      getFileCompressed(filename, contentType, (error, content) => {
        if (ERR(error, () => {
          res.writeHead(500, {});
          res.end();
        })) return;
        res.header('Content-Type', contentType);
        res.writeHead(200, {});
        res.write(content);
        res.end();
      });
    } else {
      res.writeHead(405, {allow: 'HEAD, GET'});
      res.end();
    }
  }, 3);
}

// find all includes in ace.js and embed them.
function getAceFile(callback) {
  fs.readFile(`${ROOT_DIR}js/ace.js`, 'utf8', (err, data) => {
    if (ERR(err, callback)) return;

    // Find all includes in ace.js and embed them
    const filenames = [];
    if (settings.minify) {
      const regex = /\$\$INCLUDE_[a-zA-Z_]+\((['"])([^'"]*)\1\)/gi;
      // This logic can be simplified via String.prototype.matchAll() once support for Node.js
      // v11.x and older is dropped.
      let matches;
      while ((matches = regex.exec(data)) != null) {
        filenames.push(matches[2]);
      }
    }
    // Always include the require kernel.
    filenames.push('../static/js/require-kernel.js');

    data += ';\n';
    data += 'Ace2Editor.EMBEDED = Ace2Editor.EMBEDED || {};\n';

    // Request the contents of the included file on the server-side and write
    // them into the file.
    async.forEach(filenames, (filename, callback) => {
      // Hostname "invalid.invalid" is a dummy value to allow parsing as a URI.
      const baseURI = 'http://invalid.invalid';
      let resourceURI = baseURI + path.normalize(path.join('/static/', filename));
      resourceURI = resourceURI.replace(/\\/g, '/'); // Windows (safe generally?)

      requestURI(resourceURI, 'GET', {}, (status, headers, body) => {
        const error = !(status == 200 || status == 404);
        if (!error) {
          data += `Ace2Editor.EMBEDED[${JSON.stringify(filename)}] = ${
            JSON.stringify(status == 200 ? body || '' : null)};\n`;
        } else {
          console.error(`getAceFile(): error getting ${resourceURI}. Status code: ${status}`);
        }
        callback();
      });
    }, (error) => {
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
    lastModifiedDateOfEverything((error, date) => {
      callback(error, date, !error);
    });
  } else if (filename == 'js/require-kernel.js') {
    callback(null, requireLastModified(), true);
  } else {
    fs.stat(ROOT_DIR + filename, (error, stats) => {
      if (error) {
        if (error.code == 'ENOENT') {
          // Stat the directory instead.
          statFile(path.dirname(filename), (error, date, exists) => {
            callback(error, date, false);
          }, dirStatLimit - 1);
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
  const folders2check = [`${ROOT_DIR}js/`, `${ROOT_DIR}css/`];
  let latestModification = 0;
  // go trough this two folders
  async.forEach(folders2check, (path, callback) => {
    // read the files in the folder
    fs.readdir(path, (err, files) => {
      if (ERR(err, callback)) return;

      // we wanna check the directory itself for changes too
      files.push('.');

      // go trough all files in this folder
      async.forEach(files, (filename, callback) => {
        // get the stat data of this file
        fs.stat(`${path}/${filename}`, (err, stats) => {
          if (ERR(err, callback)) return;

          // get the modification time
          const modificationTime = stats.mtime.getTime();

          // compare the modification time to the highest found
          if (modificationTime > latestModification) {
            latestModification = modificationTime;
          }

          callback();
        });
      }, callback);
    });
  }, () => {
    callback(null, latestModification);
  });
}

// This should be provided by the module, but until then, just use startup
// time.
const _requireLastModified = new Date();
function requireLastModified() {
  return _requireLastModified.toUTCString();
}
function requireDefinition() {
  return `var require = ${RequireKernel.kernelSource};\n`;
}

function getFileCompressed(filename, contentType, callback) {
  getFile(filename, (error, content) => {
    if (error || !content || !settings.minify) {
      callback(error, content);
    } else if (contentType == 'application/javascript') {
      threadsPool.queue(async ({compressJS}) => {
        try {
          logger.info('Compress JS file %s.', filename);

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
      });
    } else if (contentType == 'text/css') {
      threadsPool.queue(async ({compressCSS}) => {
        try {
          logger.info('Compress CSS file %s.', filename);

          content = await compressCSS(filename, ROOT_DIR);
        } catch (error) {
          console.error(`CleanCSS.minify() returned an error on ${filename}: ${error}`);
        }

        callback(null, content);
      });
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

exports.shutdown = async (hookName, context) => {
  await threadsPool.terminate();
};
