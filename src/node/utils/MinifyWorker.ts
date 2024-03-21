'use strict';
/**
 * Worker thread to minify JS & CSS files out of the main NodeJS thread
 */


import {promises as fsp} from "fs";
import path from 'path';
import {minifySync} from "@swc/core";
import lightminify from 'lightningcss';

export const compressJS = (content: string) => minifySync(content);

export const compressCSS = (filename: string, ROOT_DIR: string, content: Buffer) => {
  const absPath = path.resolve(ROOT_DIR, filename);
  try {
    const basePath = path.dirname(absPath);
    let { code } = lightminify.transform({
      filename: absPath,
      minify: true,
      code: content
    });
    return code;
  } catch (error) {
    // on error, just yield the un-minified original, but write a log message
    console.error(`Unexpected error minifying ${filename} (${absPath}): ${error}`);
    return content.toString()
  }
};
