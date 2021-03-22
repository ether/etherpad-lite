'use strict';
/**
 * Controls the communication with LibreOffice
 */

/*
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

const async = require('async');
const fs = require('fs').promises;
const log4js = require('log4js');
const os = require('os');
const path = require('path');
const settings = require('./Settings');
const spawn = require('child_process').spawn;

const libreOfficeLogger = log4js.getLogger('LibreOffice');

const doConvertTask = async (task) => {
  const tmpDir = os.tmpdir();

  libreOfficeLogger.debug(
      `Converting ${task.srcFile} to format ${task.type}. The result will be put in ${tmpDir}`);
  const soffice = spawn(settings.soffice, [
    '--headless',
    '--invisible',
    '--nologo',
    '--nolockcheck',
    '--writer',
    '--convert-to',
    task.type,
    task.srcFile,
    '--outdir',
    tmpDir,
  ]);
  // Soffice/libreoffice is buggy and often hangs.
  // To remedy this we kill the spawned process after a while.
  const hangTimeout = setTimeout(() => {
    soffice.stdin.pause(); // required to kill hanging threads
    soffice.kill();
  }, 120000);
  let stdoutBuffer = '';
  soffice.stdout.on('data', (data) => { stdoutBuffer += data.toString(); });
  soffice.stderr.on('data', (data) => { stdoutBuffer += data.toString(); });
  await new Promise((resolve, reject) => {
    soffice.on('exit', (code) => {
      clearTimeout(hangTimeout);
      if (code !== 0) {
        const err =
            new Error(`LibreOffice died with exit code ${code} and message: ${stdoutBuffer}`);
        libreOfficeLogger.error(err.stack);
        return reject(err);
      }
      resolve();
    });
  });

  const filename = path.basename(task.srcFile);
  const sourceFile = `${filename.substr(0, filename.lastIndexOf('.'))}.${task.fileExtension}`;
  const sourcePath = path.join(tmpDir, sourceFile);
  libreOfficeLogger.debug(`Renaming ${sourcePath} to ${task.destFile}`);
  await fs.rename(sourcePath, task.destFile);
};

// Conversion tasks will be queued up, so we don't overload the system
const queue = async.queue(doConvertTask, 1);

/**
 * Convert a file from one type to another
 *
 * @param  {String}     srcFile     The path on disk to convert
 * @param  {String}     destFile    The path on disk where the converted file should be stored
 * @param  {String}     type        The type to convert into
 * @param  {Function}   callback    Standard callback function
 */
exports.convertFile = async (srcFile, destFile, type) => {
  // Used for the moving of the file, not the conversion
  const fileExtension = type;

  if (type === 'html') {
    // "html:XHTML Writer File:UTF8" does a better job than normal html exports
    if (path.extname(srcFile).toLowerCase() === '.doc') {
      type = 'html';
    }
    // PDF files need to be converted with LO Draw ref https://github.com/ether/etherpad-lite/issues/4151
    if (path.extname(srcFile).toLowerCase() === '.pdf') {
      type = 'html:XHTML Draw File';
    }
  }

  // soffice can't convert from html to doc directly (verified with LO 5 and 6)
  // we need to convert to odt first, then to doc
  // to avoid `Error: no export filter for /tmp/xxxx.doc` error
  if (type === 'doc') {
    const intermediateFile = destFile.replace(/\.doc$/, '.odt');
    await queue.pushAsync({srcFile, destFile: intermediateFile, type: 'odt', fileExtension: 'odt'});
    await queue.pushAsync({srcFile: intermediateFile, destFile, type, fileExtension});
  } else {
    await queue.pushAsync({srcFile, destFile, type, fileExtension});
  }
};
