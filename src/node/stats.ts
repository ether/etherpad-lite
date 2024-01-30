'use strict';

// @ts-ignore
import measured from 'measured-core';

module.exports = measured.createCollection();

module.exports.shutdown = async (hookName: string, context:any) => {
  module.exports.end();
};
