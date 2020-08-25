/**
 * Worker thread to minify JS & CSS files out of the main NodeJS thread
 */

const CleanCSS = require('clean-css');
const Terser = require('terser');
const path = require('path');
const Threads = require('threads');

/**
 * Returns content compressed with Terser
 *
 * @param {string} content javascript to be compressed
 * @returns {MinifyOutput} compressed javascript
 */
function compressJS(content) {
  return Terser.minify(content);
}

function compressCSS(filename, ROOT_DIR) {
  const absPath = path.join(ROOT_DIR, filename);

 /*
  * Changes done to migrate CleanCSS 3.x -> 4.x:
  *
  * 1. Rework the rebase logic, because the API was simplified (but we have
  *    less control now). See:
  *    https://github.com/jakubpawlowicz/clean-css/blob/08f3a74925524d30bbe7ac450979de0a8a9e54b2/README.md#important-40-breaking-changes
  *
  *    EXAMPLE:
  *        The URLs contained in a CSS file (including all the stylesheets
  *        imported by it) residing on disk at:
  *            /home/muxator/etherpad/src/static/css/pad.css
  *
  *        Will be rewritten rebasing them to:
  *            /home/muxator/etherpad/src/static/css
  *
  * 2. CleanCSS.minify() can either receive a string containing the CSS, or
  *    an array of strings. In that case each array element is interpreted as
  *    an absolute local path from which the CSS file is read.
  *
  *    In version 4.x, CleanCSS API was simplified, eliminating the
  *    relativeTo parameter, and thus we cannot use our already loaded
  *    "content" argument, but we have to wrap the absolute path to the CSS
  *    in an array and ask the library to read it by itself.
  */

 const basePath = path.dirname(absPath);

 return new CleanCSS({
   rebase: true,
   rebaseTo: basePath,
   returnPromise: true
 }).minify([absPath])
}

Threads.expose({
  compressJS,
  compressCSS,
});
