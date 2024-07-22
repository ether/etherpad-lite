'use strict';

const measured = require('measured-core');

export const measuredCollection = measured.createCollection();

export const shutdown = async (hookName: string, context:any) => {
  measuredCollection.end();
};
