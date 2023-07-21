/**
 * Generates a random String with the given length. Is needed to generate the
 * Author, Group, readonly, session Ids
 */
import crypto from 'crypto';

const randomString = (len) => crypto.randomBytes(len).toString('hex');

export default randomString;
