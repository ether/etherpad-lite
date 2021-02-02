'use strict';
/**
 * Generates a random String with the given length. Is needed to generate the
 * Author, Group, readonly, session Ids
 */
const crypto = require('crypto');

const randomString = (len) => crypto.randomBytes(len).toString('hex');

module.exports = randomString;
