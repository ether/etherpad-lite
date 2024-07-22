'use strict';

// @ts-ignore
import measured from 'measured-core';

export const measuredCollection = measured.createCollection();

export const shutdown = async (hookName: string, context:any) => {
  measuredCollection.end();
};
