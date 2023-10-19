'use strict';

const crypto = require('crypto');

const newMethod = async (...args) => new Promise((resolve) => crypto.hkdf(...args, resolve));

/**
 * Promisified version of Node.js's crypto.hkdf.
 */
exports.hkdf = newMethod;

const newMethod2 = async (...args) => new Promise((resolve) => crypto.randomBytes(...args,
    resolve));

/**
 * Promisified version of Node.js's crypto.randomBytes
 */
exports.randomBytes = newMethod2;
