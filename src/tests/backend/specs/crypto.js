'use strict';

const assert = require('assert').strict;
const {Buffer} = require('buffer');
const crypto = require('../../../node/security/crypto');
const nodeCrypto = require('crypto');
const util = require('util');

const nodeHkdf = nodeCrypto.hkdf ? util.promisify(nodeCrypto.hkdf) : null;

const ab2hex = (ab) => Buffer.from(ab).toString('hex');
