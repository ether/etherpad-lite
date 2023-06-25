#!/usr/bin/env node

'use strict';

/**
 * This module is started with src/bin/run.sh. It sets up a Express HTTP and a Socket.IO Server.
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

import log4js from 'log4js';
import * as settings from "./utils/Settings";
/*
 * early check for version compatibility before calling
 * any modules that require newer versions of NodeJS
 */
import {checkDeprecationStatus, enforceMinNodeVersion} from './utils/NodeVersion'
import {Gate} from './utils/promises';
import * as UpdateCheck from "./utils/UpdateCheck";
import {Plugin} from "./models/Plugin";

let wtfnode;
if (settings.dumpOnUncleanExit) {
  // wtfnode should be loaded after log4js.replaceConsole() so that it uses log4js for logging, and
  // it should be above everything else so that it can hook in before resources are used.
  wtfnode = require('wtfnode');
}

enforceMinNodeVersion('12.17.0');
checkDeprecationStatus('12.17.0', '1.9.0');

import db = require('./db/DB');
import {} from './db/DB'
import {createServer, server} from './hooks/express';
import hooks = require('../static/js/pluginfw/hooks');
import pluginDefs = require('../static/js/pluginfw/plugin_defs');
import plugins = require('../static/js/pluginfw/plugins');
import {createCollection} from "./stats";
const logger = log4js.getLogger('server');
console.log = logger.info.bind(logger); // do the same for others - console.debug, etc.

const State = {
  INITIAL: 1,
  STARTING: 2,
  RUNNING: 3,
  STOPPING: 4,
  STOPPED: 5,
  EXITING: 6,
  WAITING_FOR_EXIT: 7,
  STATE_TRANSITION_FAILED: 8,
};

let state = State.INITIAL;

const removeSignalListener = (signal, listener) => {
  logger.debug(`Removing ${signal} listener because it might interfere with shutdown tasks. ` +
      `Function code:\n${listener.toString()}\n` +
      `Current stack:\n${(new Error()).stack.split('\n').slice(1).join('\n')}`);
  process.off(signal, listener);
};

let startDoneGate;
export const start = async () => {
  switch (state) {
    case State.INITIAL:
      break;
    case State.STARTING:
      await startDoneGate;
      // Retry. Don't fall through because it might have transitioned to STATE_TRANSITION_FAILED.
      return await start();
    case State.RUNNING:
      return server;
    case State.STOPPING:
    case State.STOPPED:
    case State.EXITING:
    case State.WAITING_FOR_EXIT:
    case State.STATE_TRANSITION_FAILED:
      throw new Error('restart not supported');
    default:
      throw new Error(`unknown State: ${state.toString()}`);
  }
  logger.info('Starting Etherpad...');
  startDoneGate = new Gate();
  state = State.STARTING;
  try {
    // Check if Etherpad version is up-to-date
    UpdateCheck.default.check();

    createCollection.gauge('memoryUsage', () => process.memoryUsage().rss);
    createCollection.gauge('memoryUsageHeap', () => process.memoryUsage().heapUsed);

    process.on('uncaughtException', (err) => {
      logger.debug(`uncaught exception: ${err.stack || err}`);

      // eslint-disable-next-line promise/no-promise-in-callback
      exit(err)
          .catch((err) => {
            logger.error('Error in process exit', err);
            // eslint-disable-next-line n/no-process-exit
            process.exit(1);
          });
    });
    // As of v14, Node.js does not exit when there is an unhandled Promise rejection. Convert an
    // unhandled rejection into an uncaught exception, which does cause Node.js to exit.
    process.on('unhandledRejection', (err:Error) => {

      logger.debug(`unhandled rejection: ${err.stack || err}`);
      throw err;
    });

    for (const signal of ['SIGINT', 'SIGTERM']) {
      // Forcibly remove other signal listeners to prevent them from terminating node before we are
      // done cleaning up. See https://github.com/andywer/threads.js/pull/329 for an example of a
      // problematic listener. This means that exports.exit is solely responsible for performing all
      // necessary cleanup tasks.
      for (const listener of process.listeners(signal as any)) {
        removeSignalListener(signal, listener);
      }
      process.on(signal, exit);
      // Prevent signal listeners from being added in the future.
      process.on('newListener', (event, listener) => {
        if (event !== signal) return;
        removeSignalListener(signal, listener);
      });
    }

    await db.init();
    await plugins.update();
    const installedPlugins = (Object.values(pluginDefs.plugins) as Plugin[])
        .filter((plugin) => plugin.package.name !== 'ep_etherpad-lite')
        .map((plugin) => `${plugin.package.name}@${plugin.package.version}`)
        .join(', ');
    logger.info(`Installed plugins: ${installedPlugins}`);
    logger.debug(`Installed parts:\n${plugins.formatParts()}`);
    logger.debug(`Installed server-side hooks:\n${plugins.formatHooks('hooks', false)}`);
    await hooks.aCallAll('loadSettings', {settings});
    await hooks.aCallAll(createServer());
  } catch (err) {
    logger.error('Error occurred while starting Etherpad');
    state = State.STATE_TRANSITION_FAILED;
    startDoneGate.resolve();
    return await exit(err);
  }

  logger.info('Etherpad is running');
  state = State.RUNNING;
  startDoneGate.resolve();
  // Return the HTTP server to make it easier to write tests.
  return server;
};

const stopDoneGate = new Gate();
export const stop = async () => {
  switch (state) {
    case State.STARTING:
      await start();
      // Don't fall through to State.RUNNING in case another caller is also waiting for startup.
      return await stop();
    case State.RUNNING:
      break;
    case State.STOPPING:
      await stopDoneGate;
      // fall through
    case State.INITIAL:
    case State.STOPPED:
    case State.EXITING:
    case State.WAITING_FOR_EXIT:
    case State.STATE_TRANSITION_FAILED:
      return;
    default:
      throw new Error(`unknown State: ${state.toString()}`);
  }
  logger.info('Stopping Etherpad...');
  state = State.STOPPING;
  try {
    let timeout = null;
    await Promise.race([
      hooks.aCallAll('shutdown'),
      new Promise((resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('Timed out waiting for shutdown tasks')), 3000);
      }),
    ]);
    clearTimeout(timeout);
  } catch (err) {
    logger.error('Error occurred while stopping Etherpad');
    state = State.STATE_TRANSITION_FAILED;
    // @ts-ignore
    stopDoneGate.resolve();
    return await exit(err);
  }
  logger.info('Etherpad stopped');
  state = State.STOPPED;
  // @ts-ignore
  stopDoneGate.resolve();
};

let exitGate;
let exitCalled = false;
export const exit = async (err = null) => {
  /* eslint-disable no-process-exit */
  if (err === 'SIGTERM') {
    // Termination from SIGTERM is not treated as an abnormal termination.
    logger.info('Received SIGTERM signal');
    err = null;
  } else if (err != null) {
    logger.error(`Metrics at time of fatal error:\n${JSON.stringify(createCollection.toJSON(), null, 2)}`);
    logger.error(err.stack || err.toString());
    process.exitCode = 1;
    if (exitCalled) {
      logger.error('Error occurred while waiting to exit. Forcing an immediate unclean exit...');
      process.exit(1);
    }
  }
  if (!exitCalled) logger.info('Exiting...');
  exitCalled = true;
  switch (state) {
    case State.STARTING:
    case State.RUNNING:
    case State.STOPPING:
      await stop();
      // Don't fall through to State.STOPPED in case another caller is also waiting for stop().
      // Don't pass err to exports.exit() because this err has already been processed. (If err is
      // passed again to exit() then exit() will think that a second error occurred while exiting.)
      return await exit();
    case State.INITIAL:
    case State.STOPPED:
    case State.STATE_TRANSITION_FAILED:
      break;
    case State.EXITING:
      await exitGate;
      // fall through
    case State.WAITING_FOR_EXIT:
      return;
    default:
      throw new Error(`unknown State: ${state.toString()}`);
  }
  exitGate = new Gate();
  state = State.EXITING;
  exitGate.resolve();

  // Node.js should exit on its own without further action. Add a timeout to force Node.js to exit
  // just in case something failed to get cleaned up during the shutdown hook. unref() is called
  // on the timeout so that the timeout itself does not prevent Node.js from exiting.
  setTimeout(() => {
    logger.error('Something that should have been cleaned up during the shutdown hook (such as ' +
        'a timer, worker thread, or open connection) is preventing Node.js from exiting');

    if (settings.dumpOnUncleanExit) {
      wtfnode.dump();
    } else {
      logger.error('Enable `dumpOnUncleanExit` setting to get a dump of objects preventing a ' +
          'clean exit');
    }

    logger.error('Forcing an unclean exit...');
    process.exit(1);
  }, 5000).unref();

  logger.info('Waiting for Node.js to exit...');
  state = State.WAITING_FOR_EXIT;
};

start()
    .then(c=>logger.info("Server started"));
