/**
 * Controls the communication with the Pandoc application
 */

/*
 * 2015 Jonathan 'bjonnh' Bisson 
 * Based (loosely) on the work of:
 * Peter 'Pita' Martischka (Primary Technology Ltd)
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

var spawn = require('child_process').spawn;
var async = require("async");
var settings = require("./Settings");
var os = require('os');

var doConvertTask;

// as there is no mechanism like the plugin system of abiword, lets just
// export spawning pandoc each time.

var stdoutBuffer = "";

doConvertTask = function(task, callback)
{
    console.log("Ready to spawn with");
    console.log(settings.pandoc);
    console.log("--output=" + task.destFile);
    console.log("--from=html");
    console.log("--to=" + task.type);
    console.log(task.srcFile);
    //span an pandoc process to perform the conversion
    var pandoc = spawn(settings.pandoc, ["--output=" + task.destFile,
                                         "--from=html",
                                         "--to=" + task.type,
                                         task.srcFile]);
    
    //delegate the processing of stdout to another function
    pandoc.stdout.on('data', function (data)
                     {
                         //add data to buffer
                         stdoutBuffer+=data.toString();
                     });

    //append error messages to the buffer
    pandoc.stderr.on('data', function (data) 
                     {
                         stdoutBuffer += data.toString();
                     });

    //throw exceptions if pandoc is dieing
    pandoc.on('exit', function (code)
              {
                  if(code != 0) {
                      return callback("Pandoc died with exit code " + code);
                  }

                  if(stdoutBuffer != "")
                  {
                      console.log(stdoutBuffer);
                  }

                  callback();
              });
};

exports.convertFile = function(srcFile, destFile, type, callback)
{
    doConvertTask({"srcFile": srcFile, "destFile": destFile, "type": type}, callback);
};

