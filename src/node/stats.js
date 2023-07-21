import measured from 'measured-core';

export default measured.createCollection();

export const shutdown = async (hookName, context) => {
  // FIXME Is this correcT?
  // eslint-disable-next-line n/no-process-exit
  process.exit(0);
};
