/**
 * Worker thread to minify JS & CSS files out of the main NodeJS thread
 */

var CleanCSS = require('clean-css');
var uglifyJS = require("uglify-js");
var path = require('path');
var Threads = require('threads')

function compressJS(content)
{
  return uglifyJS.minify(content);
}

function compressCSS(filename, ROOT_DIR)
{
  return new Promise((res, rej) => {
    try {
      const absPath = path.join(ROOT_DIR, filename);

      /*
       * Changes done to migrate CleanCSS 3.x -> 4.x:
       *
       * 1. Disabling rebase is necessary because otherwise the URLs for the web
       *    fonts become wrong.
       *
       *    EXAMPLE 1:
       *        /static/css/src/static/font/fontawesome-etherpad.woff
       *      instead of
       *        /static/font/fontawesome-etherpad.woff
       *    EXAMPLE 2 (this is more surprising):
       *        /p/src/static/font/opendyslexic.otf
       *      instead of
       *        /static/font/opendyslexic.otf
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
      new CleanCSS({ rebase: false }).minify([ absPath ], function (errors, minified) {
        if (errors) return rej(errors)

        return res(minified.styles)
      });
    }
    catch (err) {
      return rej(err)
    }
  })
}

Threads.expose({
  compressJS,
  compressCSS
})
