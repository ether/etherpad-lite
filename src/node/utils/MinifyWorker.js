'use strict';
/**
 * Worker thread to minify JS & CSS files out of the main NodeJS thread
 */

const CleanCSS = require('clean-css');
const Terser = require('terser');
const fsp = require('fs').promises;
const path = require('path');
const Threads = require('threads');

const compressJS = (content) => Terser.minify(content);

const compressCSS = async (filename, ROOT_DIR) => {
  const absPath = path.resolve(ROOT_DIR, filename);
  try {
    const basePath = path.dirname(absPath);
    const output = await new CleanCSS({
      rebase: true,
      rebaseTo: basePath,
    }).minify([absPath]);
    return output.styles;
  } catch (error) {
    // on error, just yield the un-minified original, but write a log message
    console.error(`Unexpected error minifying ${filename} (${absPath}): ${error}`);
    return await fsp.readFile(absPath, 'utf8');
  }
};

Threads.expose({
  compressJS,
  compressCSS,
});
