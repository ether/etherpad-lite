'use strict';
/**
 * Worker thread to minify JS & CSS files out of the main NodeJS thread
 */

const fsp = require('fs').promises;
import {expose} from 'threads'
import {transform} from 'esbuild';
import {bundleAsync} from 'lightningcss';

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
const compressCSS = async (content) => {
  return await bundleAsync({
    minify: true,
    filename: content
  })

};

expose({
  compressJS: compressJS,
  compressCSS,
});
