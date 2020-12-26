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

/*
 * early check for version compatibility before calling
 * any modules that require newer versions of NodeJS
 */
const NodeVersion = require('./utils/NodeVersion');
NodeVersion.enforceMinNodeVersion('10.13.0');
NodeVersion.checkDeprecationStatus('10.13.0', '1.8.3');

const UpdateCheck = require('./utils/UpdateCheck');
const db = require('./db/DB');
const express = require('./hooks/express');
const hooks = require('../static/js/pluginfw/hooks');
const npm = require('npm/lib/npm.js');
const plugins = require('../static/js/pluginfw/plugins');
const settings = require('./utils/Settings');
const util = require('util');

let started = false;
let stopped = false;

exports.start = async () => {
  if (started) return express.server;
  started = true;
  if (stopped) throw new Error('restart not supported');

  // Check if Etherpad version is up-to-date
  UpdateCheck.check();

  // start up stats counting system
  const stats = require('./stats');
  stats.gauge('memoryUsage', () => process.memoryUsage().rss);

  await util.promisify(npm.load)();

  try {
    await db.init();
    await plugins.update();
    console.info(`Installed plugins: ${plugins.formatPluginsWithVersion()}`);
    console.debug(`Installed parts:\n${plugins.formatParts()}`);
    console.debug(`Installed hooks:\n${plugins.formatHooks()}`);
    await hooks.aCallAll('loadSettings', {settings});
    await hooks.aCallAll('createServer');
  } catch (e) {
    console.error(`exception thrown: ${e.message}`);
    if (e.stack) console.log(e.stack);
    process.exit(1);
  }

  process.on('uncaughtException', exports.exit);

  /*
   * Connect graceful shutdown with sigint and uncaught exception
   *
   * Until Etherpad 1.7.5, process.on('SIGTERM') and process.on('SIGINT') were
   * not hooked up under Windows, because old nodejs versions did not support
   * them.
   *
   * According to nodejs 6.x documentation, it is now safe to do so. This
   * allows to gracefully close the DB connection when hitting CTRL+C under
   * Windows, for example.
   *
   * Source: https://nodejs.org/docs/latest-v6.x/api/process.html#process_signal_events
   *
   *   - SIGTERM is not supported on Windows, it can be listened on.
   *   - SIGINT from the terminal is supported on all platforms, and can usually
   *     be generated with <Ctrl>+C (though this may be configurable). It is not
   *     generated when terminal raw mode is enabled.
   */
  process.on('SIGINT', exports.exit);

  // When running as PID1 (e.g. in docker container) allow graceful shutdown on SIGTERM c.f. #3265.
  // Pass undefined to exports.exit because this is not an abnormal termination.
  process.on('SIGTERM', () => exports.exit());

  // Return the HTTP server to make it easier to write tests.
  return express.server;
};

exports.stop = async () => {
  if (stopped) return;
  stopped = true;
  console.log('Stopping Etherpad...');
  await new Promise(async (resolve, reject) => {
    const id = setTimeout(() => reject(new Error('Timed out waiting for shutdown tasks')), 3000);
    await hooks.aCallAll('shutdown');
    clearTimeout(id);
    resolve();
  });
};

exports.exit = async (err) => {
  let exitCode = 0;
  if (err) {
    exitCode = 1;
    console.error(err.stack ? err.stack : err);
  }
  try {
    await exports.stop();
  } catch (err) {
    exitCode = 1;
    console.error(err.stack ? err.stack : err);
  }
  process.exit(exitCode);
};

if (require.main === module) exports.start();
