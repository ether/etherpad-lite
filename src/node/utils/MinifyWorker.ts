'use strict';
/**
 * Worker thread to minify JS & CSS files out of the main NodeJS thread
 */

import Terser from 'terser'
const fsp = require('fs').promises;
import path from 'node:path'
import Threads from 'threads'
import lightminify from 'lightningcss'

const compressJS = (content: string) => Terser.minify(content);

const compressCSS = async (filename: string, ROOT_DIR: string) => {
  const absPath = path.resolve(ROOT_DIR, filename);
  try {
    const basePath = path.dirname(absPath);
    const file = await fsp.readFile(absPath, 'utf8');
    let { code } = lightminify.transform({
      errorRecovery: true,
      filename: basePath,
      minify: true,
      code: Buffer.from(file, 'utf8')
    });
    return code.toString();
  } catch (error) {
    // on error, just yield the un-minified original, but write a log message
    console.error(`Unexpected error minifying ${filename} (${absPath}): ${JSON.stringify(error)}`);
    return await fsp.readFile(absPath, 'utf8');
  }
};

Threads.expose({
  compressJS,
  compressCSS,
});
