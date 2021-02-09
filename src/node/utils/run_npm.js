'use strict';

const log4js = require('log4js');
const runCmd = require('./run_cmd');

const logger = log4js.getLogger('runNpm');
const npmLogger = log4js.getLogger('npm');

const stdoutLogger = (line) => npmLogger.info(line);
const stderrLogger = (line) => npmLogger.error(line);

/**
 * Wrapper around `runCmd()` that logs output to an npm logger by default.
 *
 * @param args Command-line arguments to pass to npm.
 * @param opts See the documentation for `runCmd()`. The `stdoutLogger` and `stderrLogger` options
 *     default to a log4js logger.
 *
 * @returns A Promise with additional `stdout`, `stderr`, and `child` properties. See the
 *     documentation for `runCmd()`.
 */
module.exports = exports = (args, opts = {}) => {
  const cmd = ['npm', ...args];
  logger.info(`Executing command: ${cmd.join(' ')}`);
  const p = runCmd(cmd, {stdoutLogger, stderrLogger, ...opts});
  p.then(
      () => logger.info(`Successfully ran command: ${cmd.join(' ')}`),
      () => logger.error(`npm command failed: ${cmd.join(' ')}`));
  // MUST return the original Promise returned from runCmd so that the caller can access stdout.
  return p;
};

// Log the version of npm at startup.
let loggedVersion = false;
(async () => {
  if (loggedVersion) return;
  loggedVersion = true;
  const p = runCmd(['npm', '--version'], {stdoutLogger: null, stderrLogger});
  const chunks = [];
  await Promise.all([
    (async () => { for await (const chunk of p.stdout) chunks.push(chunk); })(),
    p, // Await in parallel to avoid unhandled rejection if np rejects during chunk read.
  ]);
  const version = Buffer.concat(chunks).toString().replace(/\n+$/g, '');
  logger.info(`npm --version: ${version}`);
})().catch((err) => {
  logger.error(`Failed to get npm version: ${err.stack}`);
  // This isn't a fatal error so don't re-throw.
});
