'use strict';

const measured = require('measured-core');

export default measured.createCollection();

// @ts-ignore
export const shutdown = async (hookName, context) => {
  module.exports.end();
};
