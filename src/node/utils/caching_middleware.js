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

var async = require('async');
var Buffer = require('buffer').Buffer;
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var settings = require('./Settings');
var semver = require('semver');
var existsSync = require('./path_exists');

/*
 * The crypto module can be absent on reduced node installations.
 *
 * Here we copy the approach TypeScript guys used for https://github.com/microsoft/TypeScript/issues/19100
 * If importing crypto fails at runtime, we replace sha256 with djb2, which is
 * weaker, but works for our case.
 *
 * djb2 was written in 1991 by Daniel J. Bernstein.
 *
 */

// MIMIC https://github.com/microsoft/TypeScript/commit/9677b0641cc5ba7d8b701b4f892ed7e54ceaee9a - START
let _crypto;

try {
  _crypto = require('crypto');
} catch {
  _crypto = undefined;
}

var CACHE_DIR = path.normalize(path.join(settings.root, 'var/'));
CACHE_DIR = existsSync(CACHE_DIR) ? CACHE_DIR : undefined;

var responseCache = {};

function djb2Hash(data) {
  const chars = data.split("").map(str => str.charCodeAt(0));
  return `${chars.reduce((prev, curr) => ((prev << 5) + prev) + curr, 5381)}`;
}

function generateCacheKeyWithSha256(path) {
  return _crypto.createHash('sha256').update(path).digest('hex');
}

function generateCacheKeyWithDjb2(path) {
  return Buffer.from(djb2Hash(path)).toString('hex');
}

let generateCacheKey;

if (_crypto) {
  generateCacheKey = generateCacheKeyWithSha256;
} else {
  generateCacheKey = generateCacheKeyWithDjb2;
  console.warn('No crypto support in this nodejs runtime. A fallback to Djb2 (weaker) will be used.');
}

// MIMIC https://github.com/microsoft/TypeScript/commit/9677b0641cc5ba7d8b701b4f892ed7e54ceaee9a - END

/*
  This caches and compresses 200 and 404 responses to GET and HEAD requests.
  TODO: Caching and compressing are solved problems, a middleware configuration
  should replace this.
*/

function CachingMiddleware() {
}
CachingMiddleware.prototype = new function () {
  function handle(req, res, next) {
    if (!(req.method == "GET" || req.method == "HEAD") || !CACHE_DIR) {
      return next(undefined, req, res);
    }

    var old_req = {};
    var old_res = {};

    var supportsGzip =
        (req.get('Accept-Encoding') || '').indexOf('gzip') != -1;

    var path = require('url').parse(req.url).path;
    var cacheKey = generateCacheKey(path);

    fs.stat(CACHE_DIR + 'minified_' + cacheKey, function (error, stats) {
      var modifiedSince = (req.headers['if-modified-since']
          && new Date(req.headers['if-modified-since']));
      var lastModifiedCache = !error && stats.mtime;
      if (lastModifiedCache && responseCache[cacheKey]) {
        req.headers['if-modified-since'] = lastModifiedCache.toUTCString();
      } else {
        delete req.headers['if-modified-since'];
      }

      // Always issue get to downstream.
      old_req.method = req.method;
      req.method = 'GET';

      var expirationDate = new Date(((responseCache[cacheKey] || {}).headers || {})['expires']);
      if (expirationDate > new Date()) {
        // Our cached version is still valid.
        return respond();
      }

      var _headers = {};
      old_res.setHeader = res.setHeader;
      res.setHeader = function (key, value) {
        // Don't set cookies, see issue #707
        if (key.toLowerCase() === 'set-cookie') return;

        _headers[key.toLowerCase()] = value;
        old_res.setHeader.call(res, key, value);
      };

      old_res.writeHead = res.writeHead;
      res.writeHead = function (status, headers) {
        var lastModified = (res.getHeader('last-modified')
            && new Date(res.getHeader('last-modified')));

        res.writeHead = old_res.writeHead;
        if (status == 200) {
          // Update cache
          var buffer = '';

          Object.keys(headers || {}).forEach(function (key) {
            res.setHeader(key, headers[key]);
          });
          headers = _headers;

          old_res.write = res.write;
          old_res.end = res.end;
          res.write = function(data, encoding) {
            buffer += data.toString(encoding);
          };
          res.end = function(data, encoding) {
            async.parallel([
              function (callback) {
                var path = CACHE_DIR + 'minified_' + cacheKey;
                fs.writeFile(path, buffer, function (error, stats) {
                  callback();
                });
              }
            , function (callback) {
                var path = CACHE_DIR + 'minified_' + cacheKey + '.gz';
                zlib.gzip(buffer, function(error, content) {
                  if (error) {
                    callback();
                  } else {
                    fs.writeFile(path, content, function (error, stats) {
                      callback();
                    });
                  }
                });
              }
            ], function () {
              responseCache[cacheKey] = {statusCode: status, headers: headers};
              respond();
            });
          };
        } else if (status == 304) {
          // Nothing new changed from the cached version.
          old_res.write = res.write;
          old_res.end = res.end;
          res.write = function(data, encoding) {};
          res.end = function(data, encoding) { respond(); };
        } else {
          res.writeHead(status, headers);
        }
      };

      next(undefined, req, res);

      // This handles read/write synchronization as well as its predecessor,
      // which is to say, not at all.
      // TODO: Implement locking on write or ditch caching of gzip and use
      // existing middlewares.
      function respond() {
        req.method = old_req.method || req.method;
        res.write = old_res.write || res.write;
        res.end = old_res.end || res.end;

        var headers = responseCache[cacheKey].headers;
        var statusCode = responseCache[cacheKey].statusCode;

        var pathStr = CACHE_DIR + 'minified_' + cacheKey;
        if (supportsGzip && (headers['content-type'] || '').match(/^text\//)) {
          pathStr = pathStr + '.gz';
          headers['content-encoding'] = 'gzip';
        }

        var lastModified = (headers['last-modified']
            && new Date(headers['last-modified']));

        if (statusCode == 200 && lastModified <= modifiedSince) {
          res.writeHead(304, headers);
          res.end();
        } else if (req.method == 'GET') {
          var readStream = fs.createReadStream(pathStr);
          res.writeHead(statusCode, headers);
          readStream.pipe(res);
        } else {
          res.writeHead(statusCode, headers);
          res.end();
        }
      }
    });
  }

  this.handle = handle;
}();

module.exports = CachingMiddleware;
