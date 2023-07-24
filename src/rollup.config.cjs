const typescript = require('@rollup/plugin-typescript');
const commonjs = require('@rollup/plugin-commonjs');
const glob = require('glob');
const copy = require('rollup-plugin-copy');
const execute = require('rollup-plugin-shell');
const json = require('@rollup/plugin-json')
module.exports = {input: ['./node/server.js'],
  output: {
    dir: 'dist',
    format: 'cjs',
  },
  plugins: [
      json(),
    execute({commands: ['tsc'], hook: 'buildStart'}),
    commonjs(),
  ]};
