#!/usr/bin/env node

'use strict';

/**
 * This module is started with bin/run.sh. It sets up a Express HTTP and a Socket.IO Server.
 * Static file Requests are answered directly from this module, Socket.IO messages are passed
 * to MessageHandler and minfied requests are passed to minified.
 */

/*
 * 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const log4js = require('log4js');
log4js.replaceConsole();

// wtfnode should be loaded after log4js.replaceConsole() so that it uses log4js for logging, and it
// should be above everything else so that it can hook in before resources are used.
const wtfnode = require('wtfnode');

/*
 * early check for version compatibility before calling
 * any modules that require newer versions of NodeJS
 */
const NodeVersion = require('./utils/NodeVersion');
NodeVersion.enforceMinNodeVersion('10.17.0');
NodeVersion.checkDeprecationStatus('10.17.0', '1.8.8');

const UpdateCheck = require('./utils/UpdateCheck');
const db = require('./db/DB');
const express = require('./hooks/express');
const hooks = require('../static/js/pluginfw/hooks');
const npm = require('npm/lib/npm.js');
const plugins = require('../static/js/pluginfw/plugins');
const settings = require('./utils/Settings');
const util = require('util');

const State = {
  INITIAL: 1,
  STARTING: 2,
  RUNNING: 3,
  STOPPING: 4,
  STOPPED: 5,
  EXITING: 6,
  WAITING_FOR_EXIT: 7,
};

let state = State.INITIAL;

const removeSignalListener = (signal, listener) => {
  console.debug(`Removing ${signal} listener because it might interfere with shutdown tasks. ` +
                `Function code:\n${listener.toString()}\n` +
                `Current stack:\n${(new Error()).stack.split('\n').slice(1).join('\n')}`);
  process.off(signal, listener);
};

const runningCallbacks = [];
exports.start = async () => {
  switch (state) {
    case State.INITIAL:
      break;
    case State.STARTING:
      await new Promise((resolve) => runningCallbacks.push(resolve));
      // fall through
    case State.RUNNING:
      return express.server;
    case State.STOPPING:
    case State.STOPPED:
    case State.EXITING:
    case State.WAITING_FOR_EXIT:
      throw new Error('restart not supported');
    default:
      throw new Error(`unknown State: ${state.toString()}`);
  }
  console.log('Starting Etherpad...');
  state = State.STARTING;

  // Check if Etherpad version is up-to-date
  UpdateCheck.check();

  // start up stats counting system
  const stats = require('./stats');
  stats.gauge('memoryUsage', () => process.memoryUsage().rss);
  stats.gauge('memoryUsageHeap', () => process.memoryUsage().heapUsed);

  process.on('uncaughtException', exports.exit);
  // As of v14, Node.js does not exit when there is an unhandled Promise rejection. Convert an
  // unhandled rejection into an uncaught exception, which does cause Node.js to exit.
  process.on('unhandledRejection', (err) => { throw err; });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    // Forcibly remove other signal listeners to prevent them from terminating node before we are
    // done cleaning up. See https://github.com/andywer/threads.js/pull/329 for an example of a
    // problematic listener. This means that exports.exit is solely responsible for performing all
    // necessary cleanup tasks.
    for (const listener of process.listeners(signal)) {
      removeSignalListener(signal, listener);
    }
    process.on(signal, exports.exit);
    // Prevent signal listeners from being added in the future.
    process.on('newListener', (event, listener) => {
      if (event !== signal) return;
      removeSignalListener(signal, listener);
    });
  }

  await util.promisify(npm.load)();
  await db.init();
  await plugins.update();
  console.info(`Installed plugins: ${plugins.formatPluginsWithVersion()}`);
  console.debug(`Installed parts:\n${plugins.formatParts()}`);
  console.debug(`Installed hooks:\n${plugins.formatHooks()}`);
  await hooks.aCallAll('loadSettings', {settings});
  await hooks.aCallAll('createServer');

  console.log('Etherpad is running');
  state = State.RUNNING;
  while (runningCallbacks.length > 0) setImmediate(runningCallbacks.pop());

  // Return the HTTP server to make it easier to write tests.
  return express.server;
};

const stoppedCallbacks = [];
exports.stop = async () => {
  switch (state) {
    case State.STARTING:
      await exports.start();
      // Don't fall through to State.RUNNING in case another caller is also waiting for startup.
      return await exports.stop();
    case State.RUNNING:
      break;
    case State.STOPPING:
      await new Promise((resolve) => stoppedCallbacks.push(resolve));
      // fall through
    case State.INITIAL:
    case State.STOPPED:
    case State.EXITING:
    case State.WAITING_FOR_EXIT:
      return;
    default:
      throw new Error(`unknown State: ${state.toString()}`);
  }
  console.log('Stopping Etherpad...');
  state = State.STOPPING;
  let timeout = null;
  await Promise.race([
    hooks.aCallAll('shutdown'),
    new Promise((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error('Timed out waiting for shutdown tasks')), 3000);
    }),
  ]);
  clearTimeout(timeout);
  console.log('Etherpad stopped');
  state = State.STOPPED;
  while (stoppedCallbacks.length > 0) setImmediate(stoppedCallbacks.pop());
};

const exitCallbacks = [];
let exitCalled = false;
exports.exit = async (err = null) => {
  /* eslint-disable no-process-exit */
  if (err === 'SIGTERM') {
    // Termination from SIGTERM is not treated as an abnormal termination.
    console.log('Received SIGTERM signal');
    err = null;
  } else if (err != null) {
    console.error(err.stack || err.toString());
    process.exitCode = 1;
    if (exitCalled) {
      console.error('Error occurred while waiting to exit. Forcing an immediate unclean exit...');
      process.exit(1);
    }
  }
  exitCalled = true;
  switch (state) {
    case State.STARTING:
    case State.RUNNING:
    case State.STOPPING:
      await exports.stop();
      // Don't fall through to State.STOPPED in case another caller is also waiting for stop().
      // Don't pass err to exports.exit() because this err has already been processed. (If err is
      // passed again to exit() then exit() will think that a second error occurred while exiting.)
      return await exports.exit();
    case State.INITIAL:
    case State.STOPPED:
      break;
    case State.EXITING:
      await new Promise((resolve) => exitCallbacks.push(resolve));
      // fall through
    case State.WAITING_FOR_EXIT:
      return;
    default:
      throw new Error(`unknown State: ${state.toString()}`);
  }
  console.log('Exiting...');
  state = State.EXITING;
  while (exitCallbacks.length > 0) setImmediate(exitCallbacks.pop());
  // Node.js should exit on its own without further action. Add a timeout to force Node.js to exit
  // just in case something failed to get cleaned up during the shutdown hook. unref() is called on
  // the timeout so that the timeout itself does not prevent Node.js from exiting.
  setTimeout(() => {
    console.error('Something that should have been cleaned up during the shutdown hook (such as ' +
                  'a timer, worker thread, or open connection) is preventing Node.js from exiting');
    wtfnode.dump();
    console.error('Forcing an unclean exit...');
    process.exit(1);
  }, 5000).unref();
  console.log('Waiting for Node.js to exit...');
  state = State.WAITING_FOR_EXIT;
  /* eslint-enable no-process-exit */
};

if (require.main === module) exports.start();
