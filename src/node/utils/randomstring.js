/**
 * Generates a random String with the given length. Is needed to generate the Author, Group, readonly, session Ids
 */
var crypto = require('crypto');

var randomString = function(len)
{
  return crypto.randomBytes(len).toString('hex')
};

module.exports = randomString;
