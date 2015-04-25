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
 
var spawn = require('child_process').spawn;
var async = require("async");
var settings = require("./Settings");
var os = require('os');

var doConvertTask;

//on windows we have to spawn a process for each convertion, cause the plugin abicommand doesn't exist on this platform
if(os.type().indexOf("Windows") > -1)
{
  var stdoutBuffer = "";

  doConvertTask = function(task, callback)
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
        return callback("Abiword died with exit code " + code);
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
}
//on unix operating systems, we can start abiword with abicommand and communicate with it via stdin/stdout
//thats much faster, about factor 10
else
{
  //spawn the abiword process
  var abiword;
  var stdoutCallback = null;
  var spawnAbiword = function (){
    abiword = spawn(settings.abiword, ["--plugin", "AbiCommand"]);
    var stdoutBuffer = "";
    var firstPrompt = true;  

    //append error messages to the buffer
    abiword.stderr.on('data', function (data) 
    {
      stdoutBuffer += data.toString();
    });

    //abiword died, let's restart abiword and return an error with the callback
    abiword.on('exit', function (code) 
    {
      spawnAbiword();
      stdoutCallback("Abiword died with exit code " + code);
    });

    //delegate the processing of stdout to a other function
    abiword.stdout.on('data',function (data)
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
    });
  };
  spawnAbiword();

  doConvertTask = function(task, callback)
  {
    abiword.stdin.write("convert " + task.srcFile + " " + task.destFile + " " + task.type + "\n");
    //create a callback that calls the task callback and the caller callback
    stdoutCallback = function (err)
    {
      callback();
      console.log("queue continue");
      try{
        task.callback(err);
      }catch(e){
        console.error("Abiword File failed to convert", e);
      }
    };
  };
  
  //Queue with the converts we have to do
  var queue = async.queue(doConvertTask, 1);
  exports.convertFile = function(srcFile, destFile, type, callback)
  {
    queue.push({"srcFile": srcFile, "destFile": destFile, "type": type, "callback": callback});
  };
}
