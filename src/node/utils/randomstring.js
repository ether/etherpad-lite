/**
 * Generates a random String with the given length. Is needed to generate the Author, Group, readonly, session Ids
 */
var crypto = require('crypto');

var randomString = function randomString(len)
{
  crypto.randomBytes(len, function(ex, buf) {
    return buf.toString('hex');
  });
};

module.exports = randomString;
