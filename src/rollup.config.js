const typescript = require('rollup-plugin-typescript2');
const copy = require('rollup-plugin-copy');
const glob = require('glob');
const json = require('@rollup/plugin-json')
const commonJS = require('@rollup/plugin-commonjs')


module.exports = {
    input: './node/server.ts', // Matches all TypeScript files in the 'src' directory and its subdirectories
    output: {
        preserveModules: true,
        dir: './dist',
        format: 'cjs',
    },
    plugins: [
        json(),
        typescript({
            tsconfig: 'tsconfig.json',
        }),
        commonJS(),
        copy({
            targets: [
                {src:'./package.json', dest:'./dist'},
                { src: './LICENSE', dest: './dist' },
                { src: './src/locales/*', dest: './dist/locales' },
                { src: './src/static/css/*', dest: './dist/static/css' },
                { src: './src/templates', dest: './dist/templates' },
                {src:'./ep.json', dest:'./dist'},
            ]
        })
    ],
};