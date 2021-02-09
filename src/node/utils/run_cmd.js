'use strict';

const childProcess = require('child_process');
const log4js = require('log4js');
const path = require('path');
const settings = require('./Settings');

const logger = log4js.getLogger('runCmd');

const logLines = (readable, logLineFn) => {
  readable.setEncoding('utf8');
  // The process won't necessarily write full lines every time -- it might write a part of a line
  // then write the rest of the line later.
  let leftovers = '';
  readable.on('data', (chunk) => {
    const lines = chunk.split('\n');
    if (lines.length === 0) return;
    lines[0] = leftovers + lines[0];
    leftovers = lines.pop();
    for (const line of lines) {
      logLineFn(line);
    }
  });
  readable.on('end', () => {
    if (leftovers !== '') logLineFn(leftovers);
    leftovers = '';
  });
};

/**
 * Similar to `util.promisify(childProcess.exec)`, except:
 *   - `cwd` defaults to the Etherpad root directory.
 *   - PATH is prefixed with src/node_modules/.bin so that utilities from installed dependencies
 *     (e.g., npm) are preferred over system utilities.
 *   - Output is passed to logger callback functions by default. See below for details.
 *
 * @param args Array of command-line arguments, where `args[0]` is the command to run.
 * @param opts Optional options that will be passed to `childProcess.spawn()` with two extensions:
 *   - `stdoutLogger`: Callback that is called each time a line of text is written to stdout (utf8
 *     is assumed). The line (without trailing newline) is passed as the only argument. If null,
 *     stdout is not logged. If unset, defaults to no-op. Ignored if stdout is not a pipe.
 *   - `stderrLogger`: Like `stdoutLogger` but for stderr.
 *
 * @returns A Promise with `stdout`, `stderr`, and `child` properties containing the stdout stream,
 *     stderr stream, and ChildProcess objects, respectively.
 */
module.exports = exports = (args, opts = {}) => {
  logger.debug(`Executing command: ${args.join(' ')}`);

  const {stdoutLogger = () => {}, stderrLogger = () => {}} = opts;
  // Avoid confusing childProcess.spawn() with our extensions.
  opts = {...opts}; // Make a copy to avoid mutating the caller's copy.
  delete opts.stdoutLogger;
  delete opts.stderrLogger;

  // Set PATH so that utilities from installed dependencies (e.g., npm) are preferred over system
  // (global) utilities.
  let {env = process.env} = opts;
  env = {...env}; // Copy to avoid modifying process.env.
  // On Windows the PATH environment var might be spelled "Path".
  const pathVarName = Object.keys(env).filter((k) => k.toUpperCase() === 'PATH')[0] || 'PATH';
  env[pathVarName] = [
    path.join(settings.root, 'src', 'node_modules', '.bin'),
    path.join(settings.root, 'node_modules', '.bin'),
    ...(env[pathVarName] ? env[pathVarName].split(path.delimiter) : []),
  ].join(path.delimiter);
  logger.debug(`${pathVarName}=${env[pathVarName]}`);

  // Create an error object to use in case the process fails. This is done here rather than in the
  // process's `exit` handler so that we get a useful stack trace.
  const procFailedErr = new Error(`Command exited non-zero: ${args.join(' ')}`);

  const proc = childProcess.spawn(args[0], args.slice(1), {cwd: settings.root, ...opts, env});
  if (proc.stdout != null && stdoutLogger != null) logLines(proc.stdout, stdoutLogger);
  if (proc.stderr != null && stderrLogger != null) logLines(proc.stderr, stderrLogger);
  const p = new Promise((resolve, reject) => {
    proc.on('exit', (code, signal) => {
      if (code !== 0) {
        logger.debug(procFailedErr.stack);
        procFailedErr.code = code;
        procFailedErr.signal = signal;
        return reject(procFailedErr);
      }
      logger.debug(`Command returned successfully: ${args.join(' ')}`);
      resolve();
    });
  });
  p.stdout = proc.stdout;
  p.stderr = proc.stderr;
  p.child = proc;
  return p;
};
