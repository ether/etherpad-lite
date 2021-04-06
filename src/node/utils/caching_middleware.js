'use strict';

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

const Buffer = require('buffer').Buffer;
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const zlib = require('zlib');
const settings = require('./Settings');
const existsSync = require('./path_exists');
const util = require('util');

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

let CACHE_DIR = path.join(settings.root, 'var/');
CACHE_DIR = existsSync(CACHE_DIR) ? CACHE_DIR : undefined;

const responseCache = {};

const djb2Hash = (data) => {
  const chars = data.split('').map((str) => str.charCodeAt(0));
  return `${chars.reduce((prev, curr) => ((prev << 5) + prev) + curr, 5381)}`;
};

const generateCacheKeyWithSha256 =
    (path) => _crypto.createHash('sha256').update(path).digest('hex');

const generateCacheKeyWithDjb2 =
    (path) => Buffer.from(djb2Hash(path)).toString('hex');

let generateCacheKey;

if (_crypto) {
  generateCacheKey = generateCacheKeyWithSha256;
} else {
  generateCacheKey = generateCacheKeyWithDjb2;
  console.warn('No crypto support in this nodejs runtime. Djb2 (weaker) will be used.');
}

// MIMIC https://github.com/microsoft/TypeScript/commit/9677b0641cc5ba7d8b701b4f892ed7e54ceaee9a - END

/*
  This caches and compresses 200 and 404 responses to GET and HEAD requests.
  TODO: Caching and compressing are solved problems, a middleware configuration
  should replace this.
*/

module.exports = class CachingMiddleware {
  handle(req, res, next) {
    this._handle(req, res, next).catch((err) => next(err || new Error(err)));
  }

  async _handle(req, res, next) {
    if (!(req.method === 'GET' || req.method === 'HEAD') || !CACHE_DIR) {
      return next(undefined, req, res);
    }

    const oldReq = {};
    const oldRes = {};

    const supportsGzip =
        (req.get('Accept-Encoding') || '').indexOf('gzip') !== -1;

    const url = new URL(req.url, 'http://localhost');
    const cacheKey = generateCacheKey(url.pathname + url.search);

    const stats = await fsp.stat(`${CACHE_DIR}minified_${cacheKey}`).catch(() => {});
    const modifiedSince =
        req.headers['if-modified-since'] && new Date(req.headers['if-modified-since']);
    if (stats != null && stats.mtime && responseCache[cacheKey]) {
      req.headers['if-modified-since'] = stats.mtime.toUTCString();
    } else {
      delete req.headers['if-modified-since'];
    }

    // Always issue get to downstream.
    oldReq.method = req.method;
    req.method = 'GET';

    // This handles read/write synchronization as well as its predecessor,
    // which is to say, not at all.
    // TODO: Implement locking on write or ditch caching of gzip and use
    // existing middlewares.
    const respond = () => {
      req.method = oldReq.method || req.method;
      res.write = oldRes.write || res.write;
      res.end = oldRes.end || res.end;

      const headers = {};
      Object.assign(headers, (responseCache[cacheKey].headers || {}));
      const statusCode = responseCache[cacheKey].statusCode;

      let pathStr = `${CACHE_DIR}minified_${cacheKey}`;
      if (supportsGzip && /application\/javascript/.test(headers['content-type'])) {
        pathStr += '.gz';
        headers['content-encoding'] = 'gzip';
      }

      const lastModified = headers['last-modified'] && new Date(headers['last-modified']);

      if (statusCode === 200 && lastModified <= modifiedSince) {
        res.writeHead(304, headers);
        res.end();
      } else if (req.method === 'GET') {
        const readStream = fs.createReadStream(pathStr);
        res.writeHead(statusCode, headers);
        readStream.pipe(res);
      } else {
        res.writeHead(statusCode, headers);
        res.end();
      }
    };

    const expirationDate = new Date(((responseCache[cacheKey] || {}).headers || {}).expires);
    if (expirationDate > new Date()) {
      // Our cached version is still valid.
      return respond();
    }

    const _headers = {};
    oldRes.setHeader = res.setHeader;
    res.setHeader = (key, value) => {
      // Don't set cookies, see issue #707
      if (key.toLowerCase() === 'set-cookie') return;

      _headers[key.toLowerCase()] = value;
      oldRes.setHeader.call(res, key, value);
    };

    oldRes.writeHead = res.writeHead;
    res.writeHead = (status, headers) => {
      res.writeHead = oldRes.writeHead;
      if (status === 200) {
        // Update cache
        let buffer = '';

        Object.keys(headers || {}).forEach((key) => {
          res.setHeader(key, headers[key]);
        });
        headers = _headers;

        oldRes.write = res.write;
        oldRes.end = res.end;
        res.write = (data, encoding) => {
          buffer += data.toString(encoding);
        };
        res.end = async (data, encoding) => {
          await Promise.all([
            fsp.writeFile(`${CACHE_DIR}minified_${cacheKey}`, buffer).catch(() => {}),
            util.promisify(zlib.gzip)(buffer)
                .then((content) => fsp.writeFile(`${CACHE_DIR}minified_${cacheKey}.gz`, content))
                .catch(() => {}),
          ]);
          responseCache[cacheKey] = {statusCode: status, headers};
          respond();
        };
      } else if (status === 304) {
        // Nothing new changed from the cached version.
        oldRes.write = res.write;
        oldRes.end = res.end;
        res.write = (data, encoding) => {};
        res.end = (data, encoding) => { respond(); };
      } else {
        res.writeHead(status, headers);
      }
    };

    next(undefined, req, res);
  }
};
