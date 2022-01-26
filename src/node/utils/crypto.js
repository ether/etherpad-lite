'use strict';

const {Buffer} = require('buffer');
const crypto = require('crypto');
const util = require('util');

// TODO: Delete this once support for Node.js < 15.0.0 is dropped.
const hkdfFallback = async (digest, ikm, salt, info, keylen) => {
  // https://datatracker.ietf.org/doc/html/rfc5869#section-2.2
  const prkHmac = crypto.createHmac(digest, salt);
  prkHmac.update(ikm);
  const prk = prkHmac.digest();

  // https://datatracker.ietf.org/doc/html/rfc5869#section-2.3
  let len = 0;
  const t = [Buffer.alloc(0)];
  while (len < keylen) {
    const hmac = crypto.createHmac(digest, prk);
    hmac.update(t[t.length - 1]);
    hmac.update(info);
    hmac.update(Buffer.from([t.length % 256]));
    const tn = hmac.digest();
    t.push(tn);
    len += tn.length;
  }
  const buf = Buffer.concat(t);
  return (buf.byteOffset === 0 && buf.buffer.byteLength === keylen
    ? buf : Uint8Array.prototype.slice.call(buf, 0, keylen)).buffer;
};

/**
 * Promisified version of Node.js's crypto.hkdf.
 */
exports.hkdf = crypto.hkdf ? util.promisify(crypto.hkdf) : hkdfFallback;

/**
 * Promisified version of Node.js's crypto.randomBytes
 */
exports.randomBytes = util.promisify(crypto.randomBytes);

exports.exportedForTesting = {
  hkdfFallback,
};
