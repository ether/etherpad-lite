'use strict';
/**
 * Generates a random String with the given length. Is needed to generate the
 * Author, Group, readonly, session Ids
 */
const cryptoMod = require('crypto');

const randomString = (len: number) => cryptoMod.randomBytes(len).toString('hex');

module.exports = randomString;
