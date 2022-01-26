'use strict';

const assert = require('assert').strict;
const {Buffer} = require('buffer');
const crypto = require('../../../node/utils/crypto');
const nodeCrypto = require('crypto');
const util = require('util');

const nodeHkdf = nodeCrypto.hkdf ? util.promisify(nodeCrypto.hkdf) : null;

const ab2hex = (ab) => Buffer.from(ab).toString('hex');

describe(__filename, function () {
  describe('hkdf fallback', function () {
    before(async function () {
      if (!nodeHkdf) this.skip();
    });

    const testCases = [
      ['minimal', 'sha256', 1, 0, 0, 1],
      ['huge', 'sha512', 1024, 1024, 1024, 16320],
    ];

    for (const [desc, digest, ikmLen, saltLen, infoLen, keyLen] of testCases) {
      for (const strings of [false, true]) {
        it(`${desc} (${strings ? 'strings' : 'buffers'})`, async function () {
          let isi = await Promise.all([
            crypto.randomBytes(ikmLen),
            crypto.randomBytes(saltLen),
            crypto.randomBytes(infoLen),
          ]);
          if (strings) isi = isi.map((b) => b.toString('hex').slice(0, b.length));
          const args = [digest, ...isi, keyLen];
          assert.equal(
              ab2hex(await crypto.exportedForTesting.hkdfFallback(...args)),
              ab2hex(await nodeHkdf(...args)));
        });
      }
    }
  });
});
