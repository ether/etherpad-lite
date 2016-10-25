'use strict';

const argv = require('yargs').argv;
const credentials = require('../../../credentials.json');

try {
    var env = require('./env.json');

    if (env) {
        exports.env = env[process.env.NODE_ENV || 'development'];
    }
} catch(e) {}

exports.google = credentials.users.google;
exports.github = credentials.users.github;