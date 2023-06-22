'use strict';

import measured from 'measured-core'

export const createCollection = measured.createCollection();

export const shutdown = async (hookName, context) => {
  module.exports.end();
}
