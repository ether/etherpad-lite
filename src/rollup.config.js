'use strict';
const commonJS = require('@rollup/plugin-commonjs');
const jsonPlugin = require('@rollup/plugin-json');

module.exports = {
  plugins: [jsonPlugin(), commonJS()],
  input: ['./node/server.js'],
  output: {
    file: 'dist/js/main.min.js',
    format: 'cjs',
  },
  sourceMap: 'inline',
};
