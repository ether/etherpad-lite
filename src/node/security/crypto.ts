import crypto from 'node:crypto'
import util from 'node:util'


/**
 * Promisified version of Node.js's crypto.hkdf.
 */
const hkdf = util.promisify(crypto.hkdf);

/**
 * Promisified version of Node.js's crypto.randomBytes
 */
const randomBytes = util.promisify(crypto.randomBytes);

export default {
  hkdf,
  randomBytes
}
