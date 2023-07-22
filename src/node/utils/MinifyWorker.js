/**
 * Worker thread to minify JS & CSS files out of the main NodeJS thread
 */
import CleanCSS from 'clean-css';

import * as Terser from 'terser';

import {promises as fsp} from 'fs';

import path from 'path';

import * as Threads from 'threads';

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
