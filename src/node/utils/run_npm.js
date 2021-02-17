'use strict';

const log4js = require('log4js');
const runCmd = require('./run_cmd');

const logger = log4js.getLogger('runNpm');

/**
 * Wrapper around `runCmd()` to make it easier to run npm.
 *
 * @param args Command-line arguments to pass to npm.
 * @param opts See the documentation for `runCmd()`.
 *
 * @returns A Promise with additional `stdout`, `stderr`, and `child` properties. See the
 *     documentation for `runCmd()`.
 */
module.exports = exports = (args, opts = {}) => {
  const cmd = ['npm', ...args];
  // MUST return the original Promise returned from runCmd so that the caller can access stdout.
  return runCmd(cmd, opts);
};

// Log the version of npm at startup.
let loggedVersion = false;
(async () => {
  if (loggedVersion) return;
  loggedVersion = true;
  const p = runCmd(['npm', '--version'], {stdoutLogger: null});
  const chunks = [];
  await Promise.all([
    (async () => { for await (const chunk of p.stdout) chunks.push(chunk); })(),
    p, // Await in parallel to avoid unhandled rejection if p rejects during chunk read.
  ]);
  const version = Buffer.concat(chunks).toString().replace(/\n+$/g, '');
  logger.info(`npm --version: ${version}`);
})().catch((err) => {
  logger.error(`Failed to get npm version: ${err.stack}`);
  // This isn't a fatal error so don't re-throw.
});
