'use strict';
/**
 * Worker thread to minify JS & CSS files out of the main NodeJS thread
 */

const CleanCSS = require('clean-css');
const Terser = require('terser');
const path = require('path');
const Threads = require('threads');

const compressJS = (content) => Terser.minify(content);

const compressCSS = (filename, ROOT_DIR) => new Promise((res, rej) => {
  try {
    const absPath = path.resolve(ROOT_DIR, filename);
    const basePath = path.dirname(absPath);

    new CleanCSS({
      rebase: true,
      rebaseTo: basePath,
    }).minify([absPath], (errors, minified) => {
      if (errors) return rej(errors);

      return res(minified.styles);
    });
  } catch (error) {
    // on error, just yield the un-minified original, but write a log message
    console.error(`Unexpected error minifying ${filename} (${absPath}): ${error}`);
    callback(null, content);
  }
});

Threads.expose({
  compressJS,
  compressCSS,
});
