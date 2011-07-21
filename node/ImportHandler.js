/**
 * Handles the import requests
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

var padManager = require("./PadManager");
var padMessageHandler = require("./PadMessageHandler");
var async = require("async");
var fs = require("fs");
var settings = require('./settings');
var formidable = require('formidable');

//load abiword only if its enabled
if(settings.abiword != null)
  var abiword = require("./Abiword");
  
/**
 * do a requested import
 */ 
exports.doImport = function(req, res, padId)
{
  //pipe to a file
  //convert file to text via abiword
  //set text in the pad
  
  var srcFile, destFile;
  var pad;
  var text;
  
  async.series([
    //save the uploaded file to /tmp
    function(callback)
    {
      var form = new formidable.IncomingForm();
      form.keepExtensions = true;
      
      form.parse(req, function(err, fields, files) 
      { 
        //save the path of the uploaded file
        srcFile = files.file.path;
        
        callback(err);
      });
    },
    
    //convert file to text
    function(callback)
    {
      var randNum = Math.floor(Math.random()*new Date().getTime());
      destFile = "/tmp/eplite_import_" + randNum + ".txt";
      abiword.convertFile(srcFile, destFile, "txt", callback);
    },
    
    //get the pad object
    function(callback)
    {
      padManager.getPad(padId, function(err, _pad)
      {
        pad = _pad;
        callback(err);
      });
    },
    
    //read the text
    function(callback)
    {
      fs.readFile(destFile, "utf8", function(err, _text)
      {
        text = _text;
        callback(err);
      });
    },
    
    //change text of the pad and broadcast the changeset
    function(callback)
    {
      pad.setText(text);
      padMessageHandler.updatePadClients(pad, callback);
    },
    
    //clean up temporary files
    function(callback)
    {
      async.parallel([
        function(callback)
        {
          fs.unlink(srcFile, callback);
        },
        function(callback)
        {
          fs.unlink(destFile, callback);
        }
      ], callback);
    }
  ], function(err)
  {
    //close the connection
    res.send("ok");
  
    if(err) throw err;
  });
}
