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

import {ChildProcess} from "node:child_process";
import {AsyncQueueTask} from "../types/AsyncQueueTask";

const spawn = require('child_process').spawn;
const async = require('async');
import {abiword} from './Settings';
const os = require('os');

// on windows we have to spawn a process for each convertion,
// cause the plugin abicommand doesn't exist on this platform
if (os.type().indexOf('Windows') > -1) {
  exports.convertFile = async (srcFile: string, destFile: string, type: string) => {
    const _abiword = spawn(abiword, [`--to=${destFile}`, srcFile]);
    let stdoutBuffer = '';
    _abiword.stdout.on('data', (data: string) => { stdoutBuffer += data.toString(); });
    _abiword.stderr.on('data', (data: string) => { stdoutBuffer += data.toString(); });
    await new Promise<void>((resolve, reject) => {
      _abiword.on('exit', (code: number) => {
        if (code !== 0) return reject(new Error(`Abiword died with exit code ${code}`));
        if (stdoutBuffer !== '') {
          console.log(stdoutBuffer);
        }
        resolve();
      });
    });
  };
  // on unix operating systems, we can start abiword with abicommand and
  // communicate with it via stdin/stdout
  // thats much faster, about factor 10
} else {
  let _abiword: ChildProcess;
  let stdoutCallback: Function|null = null;
  const spawnAbiword = () => {
    _abiword = spawn(abiword, ['--plugin', 'AbiCommand']);
    let stdoutBuffer = '';
    let firstPrompt = true;
    _abiword.stderr!.on('data', (data) => { stdoutBuffer += data.toString(); });
    _abiword.on('exit', (code) => {
      spawnAbiword();
      if (stdoutCallback != null) {
        stdoutCallback(new Error(`Abiword died with exit code ${code}`));
        stdoutCallback = null;
      }
    });
    _abiword.stdout!.on('data', (data) => {
      stdoutBuffer += data.toString();
      // we're searching for the prompt, cause this means everything we need is in the buffer
      if (stdoutBuffer.search('AbiWord:>') !== -1) {
        const err = stdoutBuffer.search('OK') !== -1 ? null : new Error(stdoutBuffer);
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

  const queue = async.queue((task: AsyncQueueTask, callback:Function) => {
    _abiword.stdin!.write(`convert ${task.srcFile} ${task.destFile} ${task.type}\n`);
    stdoutCallback = (err: string) => {
      if (err != null) console.error('Abiword File failed to convert', err);
      callback(err);
    };
  }, 1);

  exports.convertFile = async (srcFile: string, destFile: string, type: string) => {
    await queue.pushAsync({srcFile, destFile, type});
  };
}
