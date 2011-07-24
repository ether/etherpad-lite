/**
 * Controls the communication with the Abiword application
 */

/*
 * 2011 Peter 'Pita' Martischka
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
 
var util  = require('util');
var spawn = require('child_process').spawn;
var async = require("async");
var settings = require("./settings");

//Queue with the converts we have to do
var queue = async.queue(doConvertTask, 1);

//spawn the abiword process
var abiword = spawn(settings.abiword, ["--plugin", "AbiCommand"]);

//append error messages to the buffer
abiword.stderr.on('data', function (data) 
{
  stdoutBuffer += data.toString();
});

//throw exceptions if abiword is dieing
abiword.on('exit', function (code) 
{
  throw "Abiword died with exit code " + code;
});

//delegate the processing of stdout to a other function
abiword.stdout.on('data',onAbiwordStdout);

var stdoutCallback = null;
var stdoutBuffer = "";
var firstPrompt = true;

function onAbiwordStdout(data)
{
  //add data to buffer
  stdoutBuffer+=data.toString();
  
  //we're searching for the prompt, cause this means everything we need is in the buffer
  if(stdoutBuffer.search("AbiWord:>") != -1)
  {
    //filter the feedback message
    var err = stdoutBuffer.search("OK") != -1 ? null : stdoutBuffer;
    
    //reset the buffer
    stdoutBuffer = "";
    
    //call the callback with the error message
    //skip the first prompt
    if(stdoutCallback != null && !firstPrompt)
    {
      stdoutCallback(err);
      stdoutCallback = null;
    }
    
    firstPrompt = false;
  }
}

function doConvertTask(task, callback)
{
  abiword.stdin.write("convert " + task.srcFile + " " + task.destFile + " " + task.type + "\n");
  
  //create a callback that calls the task callback and the caller callback
  stdoutCallback = function (err)
  {
    callback();
    task.callback(err);
  };
}

exports.convertFile = function(srcFile, destFile, type, callback)
{
  queue.push({"srcFile": srcFile, "destFile": destFile, "type": type, "callback": callback});
};
