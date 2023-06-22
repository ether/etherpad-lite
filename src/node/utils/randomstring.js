'use strict';
/**
 * Generates a random String with the given length. Is needed to generate the
 * Author, Group, readonly, session Ids
 */
import crypto from 'crypto'

export const randomString = (len) => crypto.randomBytes(len).toString('hex');
