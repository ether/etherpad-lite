'use strict';

// @ts-ignore
import measured from 'measured-core';

export default measured.createCollection();

export const shutdown = async (hookName: string, context:any) => {
  module.exports.end();
};
