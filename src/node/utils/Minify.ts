'use strict';

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

import {compressCSS, compressJS} from "./MinifyWorker";
import {MapArrayType} from "../types/MapType";

const settings = require('./Settings');
import {promises as fs} from 'fs'
import path from 'path';
const plugins = require('../../static/js/pluginfw/plugin_defs');
const RequireKernel = require('etherpad-require-kernel');
import mime from 'mime-types';
import log4js from 'log4js';
const sanitizePathname = require('./sanitizePathname');
const logger = log4js.getLogger('Minify');

const ROOT_DIR = path.join(settings.root, 'src/static/');


const LIBRARY_WHITELIST = [
  'async',
  'js-cookie',
  'security',
  'split-grid',
  'tinycon',
  'underscore',
  'unorm',
];

// What follows is a terrible hack to avoid loop-back within the server.
// TODO: Serve files from another service, or directly from the file system.
export const requestURI = async (url: string, method: string, headers: MapArrayType<any>) => {
  const parsedUrl = new URL(url);
  let status = 500;
  const content: string[] = [];
  const mockRequest = {
    url,
    method,
    params: {filename: (parsedUrl.pathname + parsedUrl.search).replace(/^\/static\//, '')},
    headers,
  };
  let mockResponse;
  const p = new Promise((resolve) => {
    mockResponse = {
      writeHead: (_status: number, _headers: MapArrayType<any>) => {
        status = _status;
        for (const header in _headers) {
          if (Object.prototype.hasOwnProperty.call(_headers, header)) {
            headers[header] = _headers[header];
          }
        }
      },
      setHeader: (header: string, value: string) => {
        headers[header.toLowerCase()] = value.toString();
      },
      header: (header: string, value: string) => {
        headers[header.toLowerCase()] = value.toString();
      },
      write: (_content: string) => {
        _content && content.push(_content);
      },
      end: (_content: string) => {
        _content && content.push(_content);
        resolve([status, headers, content.join('')]);
      },
    };
  });
  await minify(mockRequest, mockResponse);
  return await p;
};

export const requestURIs = (locations: string[], method: string, headers: string[], callback:Function) => {
  Promise.all(locations.map(async (loc) => {
    try {
      return await requestURI(loc, method, headers);
    } catch (err:any) {
      logger.debug(`requestURI(${JSON.stringify(loc)}, ${JSON.stringify(method)}, ` +
                   `${JSON.stringify(headers)}) failed: ${err.stack || err}`);
      return [500, headers, ''];
    }
    // @ts-ignore
  })).then((responses:[[number,number,number]]) => {
    const statuss = responses.map((x) => x[0]);
    const headerss = responses.map((x) => x[1]);
    const contentss = responses.map((x) => x[2]);
    callback(statuss, headerss, contentss);
  });
};

const compatPaths = {
  'js/browser.js': 'js/vendors/browser.js',
  'js/farbtastic.js': 'js/vendors/farbtastic.js',
  'js/gritter.js': 'js/vendors/gritter.js',
  'js/html10n.js': 'js/vendors/html10n.js',
  'js/jquery.js': 'js/vendors/jquery.js',
  'js/nice-select.js': 'js/vendors/nice-select.js',
};

/**
 * creates the minifed javascript for the given minified name
 * @param req the Express request
 * @param res the Express response
 */
export const minify = async (req: any, res:any) => {
  let filename = req.params.filename;
  try {
    filename = sanitizePathname(filename);
  } catch (err:any) {
    logger.error(`sanitization of pathname "${filename}" failed: ${err.stack || err}`);
    res.writeHead(404, {});
    res.end();
    return;
  }

  // Backward compatibility for plugins that require() files from old paths.
  // @ts-ignore
  const newLocation = compatPaths[filename.replace(/^plugins\/ep_etherpad-lite\/static\//, '')];
  if (newLocation != null) {
    logger.warn(`request for deprecated path "${filename}", replacing with "${newLocation}"`);
    filename = newLocation;
  }

  /* Handle static files for plugins/libraries:
     paths like "plugins/ep_myplugin/static/js/test.js"
     are rewritten into ROOT_PATH_OF_MYPLUGIN/static/js/test.js,
     commonly ETHERPAD_ROOT/node_modules/ep_myplugin/static/js/test.js
  */
  const match = filename.match(/^plugins\/([^/]+)(\/(?:(static\/.*)|.*))?$/);
  if (match) {
    const library = match[1];
    const libraryPath = match[2] || '';

    if (plugins.plugins[library] && match[3]) {
      const plugin = plugins.plugins[library];
      const pluginPath = plugin.package.realPath;
      filename = path.join(pluginPath, libraryPath);
      // On Windows, path.relative converts forward slashes to backslashes. Convert them back
      // because some of the code below assumes forward slashes. Node.js treats both the backlash
      // and the forward slash characters as pathname component separators on Windows so this does
      // not change the meaning of the pathname. This conversion does not introduce a directory
      // traversal vulnerability because all '..\\' substrings have already been removed by
      // sanitizePathname.
      filename = filename.replace(/\\/g, '/');
    } else if (LIBRARY_WHITELIST.indexOf(library) !== -1) {
      // Go straight into node_modules
      // Avoid `require.resolve()`, since 'mustache' and 'mustache/index.js'
      // would end up resolving to logically distinct resources.
      filename = path.join('../node_modules/', library, libraryPath);
    }
  }
  const [, testf] = /^plugins\/ep_etherpad-lite\/(tests\/frontend\/.*)/.exec(filename) || [];
  if (testf != null) filename = `../${testf}`;

  const contentType = mime.lookup(filename) as string;

  const [date, exists] = await statFile(filename, 3);
  if (date) {
    date.setMilliseconds(0);
    res.setHeader('last-modified', date.toUTCString());
    res.setHeader('date', (new Date()).toUTCString());
    if (settings.maxAge !== undefined) {
      const expiresDate = new Date(Date.now() + settings.maxAge * 1000);
      res.setHeader('expires', expiresDate.toUTCString());
      res.setHeader('cache-control', `max-age=${settings.maxAge}`);
    }
  }

  if (!exists) {
    res.writeHead(404, {});
    res.end();
  } else if (new Date(req.headers['if-modified-since']) >= date!) {
    res.writeHead(304, {});
    res.end();
  } else if (req.method === 'HEAD') {
    res.header('Content-Type', contentType);
    res.writeHead(200, {});
    res.end();
  } else if (req.method === 'GET') {
    const content = await getFileCompressed(filename, contentType);
    res.header('Content-Type', contentType);
    res.writeHead(200, {});
    res.write(content);
    res.end();
  } else {
    res.writeHead(405, {allow: 'HEAD, GET'});
    res.end();
  }
};

// Check for the existance of the file and get the last modification date.
const statFile = async (filename: string, dirStatLimit: number):Promise<[Date|null, boolean]> => {
  /*
   * The only external call to this function provides an explicit value for
   * dirStatLimit: this check could be removed.
   */
  if (typeof dirStatLimit === 'undefined') {
    dirStatLimit = 3;
  }

  if (dirStatLimit < 1 || filename === '' || filename === '/') {
    return [null, false];
  } else if (filename === 'js/ace.js') {
    // Sometimes static assets are inlined into this file, so we have to stat
    // everything.
    return [await lastModifiedDateOfEverything(), true];
  } else if (filename === 'js/require-kernel.js') {
    return [_requireLastModified, true];
  } else {
    let stats;
    try {
      stats = await fs.stat(path.resolve(ROOT_DIR, filename));
    } catch (err:any) {
      if (['ENOENT', 'ENOTDIR'].includes(err.code)) {
        // Stat the directory instead.
        // @ts-ignore
        const [date] = await statFile(path.dirname(filename), dirStatLimit - 1);
        return [date, false];
      }
      throw err;
    }
    return [stats.mtime, stats.isFile()];
  }
};

const lastModifiedDateOfEverything = async () => {
  const folders2check = [path.join(ROOT_DIR, 'js/'), path.join(ROOT_DIR, 'css/')];
  let latestModification:Date|null = null;
  // go through this two folders
  await Promise.all(folders2check.map(async (dir) => {
    // read the files in the folder
    const files = await fs.readdir(dir);

    // we wanna check the directory itself for changes too
    files.push('.');

    // go through all files in this folder
    await Promise.all(files.map(async (filename: string) => {
      // get the stat data of this file
      const stats = await fs.stat(path.join(dir, filename));

      // compare the modification time to the highest found
      if (latestModification == null || stats.mtime > latestModification) {
        latestModification = stats.mtime;
      }
    }));
  }));
  return latestModification;
};

// This should be provided by the module, but until then, just use startup
// time.
const _requireLastModified = new Date();
const requireDefinition = () => `var require = ${RequireKernel.kernelSource};\n`;

const getFileCompressed = async (filename: string, contentType: string) => {

  const ensureBuffer = (input: string|Buffer|object)=> {
    if (Buffer.isBuffer(input)) {
      return input;
    } else if (typeof input === 'string') {
      return Buffer.from(input);
    } else {
      throw new Error('Input should be a Buffer or a string');
    }
  }

  let content = await getFile(filename);
  if (!content || !settings.minify) {
    return content;
  } else if (contentType === 'application/javascript') {
      try {
        logger.info('Compress JS file %s.', filename);

        const compressResult = compressJS(ensureBuffer(content).toString());

        return compressResult.code.toString(); // Convert content obj code to string
      } catch (error) {
        console.error('getFile() returned an error in ' +
                        `getFileCompressed(${filename}, ${contentType}): ${error}`);
      }
    return content
  } else if (contentType === 'text/css') {
    try {
      logger.info('Compress CSS file %s.', filename);
      return compressCSS(filename, ROOT_DIR, ensureBuffer(content));
    } catch (error) {
      console.error(`CleanCSS.minify() returned an error on ${filename}: ${error}`);
    }
  } else {
    return content;
  }
};

const getFile = async (filename: string) => {
  if (filename === 'js/require-kernel.js') return requireDefinition();
  return await fs.readFile(path.resolve(ROOT_DIR, filename));
};

exports.minify = (req: Request, res: Response, next: Function) => minify(req, res).catch((err) => next(err || new Error(err)));
