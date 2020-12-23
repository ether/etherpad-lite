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

const async = require('async');
const Buffer = require('buffer').Buffer;
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const settings = require('./Settings');
const existsSync = require('./path_exists');
const queryString = require('querystring');
const url = require('url');

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

let CACHE_DIR = path.normalize(path.join(settings.root, 'var/'));
CACHE_DIR = existsSync(CACHE_DIR) ? CACHE_DIR : undefined;

const responseCache = {};

function djb2Hash(data) {
  const chars = data.split('').map((str) => str.charCodeAt(0));
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
    if (!(req.method == 'GET' || req.method == 'HEAD') || !CACHE_DIR) {
      return next(undefined, req, res);
    }

    const old_req = {};
    const old_res = {};

    const supportsGzip =
        (req.get('Accept-Encoding') || '').indexOf('gzip') !== -1;

    const URL = url.parse(req.url);
    const query = queryString.parse(URL.query);

    // callback must be `require.define`
    if (query.callback !== 'require.define') {
      return next('cm1', req, res);
    }

    // in case the v parameter is given, it must contain the current version string
    if (query.v && query.v !== settings.randomVersionString) {
      return next('cm2', req, res);
    }

    // does it contain more than the two allowed parameter `callback` and `v`?
    Object.keys(query).forEach((param) => {
      if (param !== 'callback' && param !== 'v') {
        return next('cm3', req, res);
      }
    });

    const path = URL.path;
    const cacheKey = generateCacheKey(path);

    fs.stat(`${CACHE_DIR}minified_${cacheKey}`, (error, stats) => {
      const modifiedSince = (req.headers['if-modified-since'] &&
          new Date(req.headers['if-modified-since']));
      const lastModifiedCache = !error && stats.mtime;
      if (lastModifiedCache && responseCache[cacheKey]) {
        req.headers['if-modified-since'] = lastModifiedCache.toUTCString();
      } else {
        delete req.headers['if-modified-since'];
      }

      // Always issue get to downstream.
      old_req.method = req.method;
      req.method = 'GET';

      const expirationDate = new Date(((responseCache[cacheKey] || {}).headers || {}).expires);
      if (expirationDate > new Date()) {
        // Our cached version is still valid.
        return respond();
      }

      const _headers = {};
      old_res.setHeader = res.setHeader;
      res.setHeader = function (key, value) {
        // Don't set cookies, see issue #707
        if (key.toLowerCase() === 'set-cookie') return;

        _headers[key.toLowerCase()] = value;
        old_res.setHeader.call(res, key, value);
      };

      old_res.writeHead = res.writeHead;
      res.writeHead = function (status, headers) {
        const lastModified = (res.getHeader('last-modified') &&
            new Date(res.getHeader('last-modified')));

        res.writeHead = old_res.writeHead;
        if (status == 200) {
          // Update cache
          let buffer = '';

          Object.keys(headers || {}).forEach((key) => {
            res.setHeader(key, headers[key]);
          });
          headers = _headers;

          old_res.write = res.write;
          old_res.end = res.end;
          res.write = function (data, encoding) {
            buffer += data.toString(encoding);
          };
          res.end = function (data, encoding) {
            async.parallel([
              function (callback) {
                const path = `${CACHE_DIR}minified_${cacheKey}`;
                fs.writeFile(path, buffer, (error, stats) => {
                  callback();
                });
              },
              function (callback) {
                const path = `${CACHE_DIR}minified_${cacheKey}.gz`;
                zlib.gzip(buffer, (error, content) => {
                  if (error) {
                    callback();
                  } else {
                    fs.writeFile(path, content, (error, stats) => {
                      callback();
                    });
                  }
                });
              },
            ], () => {
              responseCache[cacheKey] = {statusCode: status, headers};
              respond();
            });
          };
        } else if (status == 304) {
          // Nothing new changed from the cached version.
          old_res.write = res.write;
          old_res.end = res.end;
          res.write = function (data, encoding) {};
          res.end = function (data, encoding) { respond(); };
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

        const headers = {};
        Object.assign(headers, (responseCache[cacheKey].headers || {}));
        const statusCode = responseCache[cacheKey].statusCode;

        let pathStr = `${CACHE_DIR}minified_${cacheKey}`;
        if (supportsGzip && /application\/javascript/.test(headers['content-type'])) {
          pathStr += '.gz';
          headers['content-encoding'] = 'gzip';
        }

        const lastModified = (headers['last-modified'] &&
            new Date(headers['last-modified']));

        if (statusCode == 200 && lastModified <= modifiedSince) {
          res.writeHead(304, headers);
          res.end();
        } else if (req.method == 'GET') {
          const readStream = fs.createReadStream(pathStr);
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
