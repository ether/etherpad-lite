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
var settings = require("./Settings");

var stdoutBuffer = "";

function doConvertTask(task, callback)
{
  //span an abiword process to perform the conversion
  var abiword = spawn(settings.abiword, ["--to=" + task.destFile, task.srcFile]);
  
  //delegate the processing of stdout to another function
  abiword.stdout.on('data', function (data)
  {
    //add data to buffer
    stdoutBuffer+=data.toString();
  });

  //append error messages to the buffer
  abiword.stderr.on('data', function (data) 
  {
    stdoutBuffer += data.toString();
  });

  //throw exceptions if abiword is dieing
  abiword.on('exit', function (code)
  {
    if(code != 0) {
      throw "Abiword died with exit code " + code;
    }

    if(stdoutBuffer != "")
    {
      console.log(stdoutBuffer);
    }

    callback();
  });
}

exports.convertFile = function(srcFile, destFile, type, callback)
{
  doConvertTask({"srcFile": srcFile, "destFile": destFile, "type": type}, callback);
};
