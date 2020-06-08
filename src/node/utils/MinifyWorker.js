/**
 * Worker thread to minify JS & CSS files out of the main NodeJS thread
 */

var CleanCSS = require('clean-css');
var Terser = require("terser");
var path = require('path');
var Threads = require('threads')

function compressJS(content)
{
  return Terser.minify(content);
}

function compressCSS(filename, ROOT_DIR)
{
  return new Promise((res, rej) => {
    try {
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

      new CleanCSS({
        rebase: true,
        rebaseTo: basePath,
      }).minify([absPath], function (errors, minified) {
        if (errors) return rej(errors)

        return res(minified.styles)
      });
    } catch (error) {
      // on error, just yield the un-minified original, but write a log message
      console.error(`Unexpected error minifying ${filename} (${absPath}): ${error}`);
      callback(null, content);
    }
  })
}

Threads.expose({
  compressJS,
  compressCSS
})
