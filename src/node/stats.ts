'use strict';

// @ts-ignore
import measured from 'measured-core';

const coll = measured.createCollection()

export default coll;

// @ts-ignore
export const shutdown = async (hookName, context) => {
  coll.end();
};
