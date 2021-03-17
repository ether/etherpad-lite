'use strict';
/**
 * Controls the communication with the Abiword application
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

const spawn = require('child_process').spawn;
const async = require('async');
const settings = require('./Settings');
const os = require('os');

let doConvertTask;

// on windows we have to spawn a process for each convertion,
// cause the plugin abicommand doesn't exist on this platform
if (os.type().indexOf('Windows') > -1) {
  doConvertTask = (task, callback) => {
    const abiword = spawn(settings.abiword, [`--to=${task.destFile}`, task.srcFile]);
    let stdoutBuffer = '';
    abiword.stdout.on('data', (data) => { stdoutBuffer += data.toString(); });
    abiword.stderr.on('data', (data) => { stdoutBuffer += data.toString(); });
    abiword.on('exit', (code) => {
      if (code !== 0) {
        return callback(`Abiword died with exit code ${code}`);
      }
      if (stdoutBuffer !== '') {
        console.log(stdoutBuffer);
      }
      callback();
    });
  };

  exports.convertFile = (srcFile, destFile, type, callback) => {
    doConvertTask({srcFile, destFile, type}, callback);
  };
  // on unix operating systems, we can start abiword with abicommand and
  // communicate with it via stdin/stdout
  // thats much faster, about factor 10
} else {
  let abiword;
  let stdoutCallback = null;
  const spawnAbiword = () => {
    abiword = spawn(settings.abiword, ['--plugin', 'AbiCommand']);
    let stdoutBuffer = '';
    let firstPrompt = true;
    abiword.stderr.on('data', (data) => { stdoutBuffer += data.toString(); });
    abiword.on('exit', (code) => {
      spawnAbiword();
      stdoutCallback(`Abiword died with exit code ${code}`);
    });
    abiword.stdout.on('data', (data) => {
      stdoutBuffer += data.toString();
      // we're searching for the prompt, cause this means everything we need is in the buffer
      if (stdoutBuffer.search('AbiWord:>') !== -1) {
        const err = stdoutBuffer.search('OK') !== -1 ? null : stdoutBuffer;
        stdoutBuffer = '';
        if (stdoutCallback != null && !firstPrompt) {
          stdoutCallback(err);
          stdoutCallback = null;
        }
        firstPrompt = false;
      }
    });
  };
  spawnAbiword();

  doConvertTask = (task, callback) => {
    abiword.stdin.write(`convert ${task.srcFile} ${task.destFile} ${task.type}\n`);
    stdoutCallback = (err) => {
      callback();
      console.log('queue continue');
      try {
        task.callback(err);
      } catch (e) {
        console.error('Abiword File failed to convert', e);
      }
    };
  };

  const queue = async.queue(doConvertTask, 1);
  exports.convertFile = (srcFile, destFile, type, callback) => {
    queue.push({srcFile, destFile, type, callback});
  };
}
