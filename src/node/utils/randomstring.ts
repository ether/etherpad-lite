'use strict';
/**
 * Generates a random String with the given length. Is needed to generate the
 * Author, Group, readonly, session Ids
 */
import {randomBytes} from 'crypto';

export const randomString = (len: number) => randomBytes(len).toString('hex');
