'use strict';
/**
 * Worker thread to minify JS & CSS files out of the main NodeJS thread
 */

const fsp = require('fs').promises;
import path from 'node:path'
import {expose} from 'threads'
import lightminify from 'lightningcss'
import {transform} from 'esbuild';

/*
  * Minify JS content
  * @param {string} content - JS content to minify
 */
const compressJS = async (content) => {
  return await transform(content, {minify: true});
}

/*
  * Minify CSS content
  * @param {string} filename - name of the file
  * @param {string} ROOT_DIR - the root dir of Etherpad
 */
const compressCSS = async (filename, ROOT_DIR) => {
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

expose({
  compressJS: compressJS,
  compressCSS,
});
