/**
 * Handles the import requests
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

var ERR = require("async-stacktrace")
  , padManager = require("../db/PadManager")
  , padMessageHandler = require("./PadMessageHandler")
  , async = require("async")
  , fs = require("fs")
  , settings = require('../utils/Settings')
  , formidable = require('formidable')
  , os = require("os")
  , importHtml = require("../utils/ImportHtml");

//load abiword only if its enabled
if(settings.abiword != null)
  var abiword = require("../utils/Abiword");
  
/**
 * do a requested import
 */ 
exports.doImport = function(req, res, padId)
{
  //pipe to a file
  //convert file to html via abiword
  //set html in the pad
  
  var srcFile, destFile
    , pad;
    , text;
  
  async.series([
    //save the uploaded file to /tmp
    function(callback) {
      var form = new formidable.IncomingForm();
      form.keepExtensions = true;
      
      form.parse(req, function(err, fields, files) { 
        //the upload failed, stop at this point
        if(err || files.file === undefined) {
          console.warn("Uploading Error: " + err.stack);
          callback("uploadFailed");
        }
        //everything ok, continue
        else {
          //save the path of the uploaded file
          srcFile = files.file.path;
          callback();
        }
      });
    },
    
    //ensure this is a file ending we know, else we change the file ending to .txt
    //this allows us to accept source code files like .c or .java
    function(callback) {
      var fileEnding = (srcFile.split(".")[1] || "").toLowerCase();
      var knownFileEndings = ["txt", "doc", "docx", "pdf", "odt", "html", "htm"];
      
      //find out if this is a known file ending
      var fileEndingKnown = false;
      for(var i in knownFileEndings) {
        if(fileEnding == knownFileEndings[i]){
          fileEndingKnown = true;
        }
      }
      
      //if the file ending is known, continue as normal
      if(fileEndingKnown) {
        callback();
      }
      //we need to rename this file with a .txt ending
      else {
        var oldSrcFile = srcFile;
        srcFile = srcFile.split(".")[0] + ".txt";
        
        fs.rename(oldSrcFile, srcFile, callback);
      }
    },
    
    //convert file to text
    function(callback) {
      var randNum = Math.floor(Math.random()*0xFFFFFFFF);
		destFile = os.tmpDir() + "/eplite_import_" + randNum + ".htm";
      abiword.convertFile(srcFile, destFile, "htm", function(err) {
        //catch convert errors
        if(err) {
          console.warn("Converting Error:", err);
          return callback("convertFailed");
        } else {
          callback();
        }
      });
    },
    
    //get the pad object
    function(callback) {
      padManager.getPad(padId, function(err, _pad){
        if(ERR(err, callback)) return;
        pad = _pad;
        callback();
      });
    },
    
    //read the text
    function(callback) {
      fs.readFile(destFile, "utf8", function(err, _text){
        if(ERR(err, callback)) return;
        text = _text;
        
        //node on windows has a delay on releasing of the file lock.  
        //We add a 100ms delay to work around this
	      if(os.type().indexOf("Windows") > -1){
          setTimeout(function(){callback();}, 100);
	      } else {
	        callback();
	      }
      });
    },
    
    //change text of the pad and broadcast the changeset
    function(callback) {
		importHtml.setPadHTML(pad, text);
      padMessageHandler.updatePadClients(pad, callback);
    },
    
    //clean up temporary files
    function(callback) {
      async.parallel([
        function(callback){
          fs.unlink(srcFile, callback);
        },
        function(callback){
          fs.unlink(destFile, callback);
        }
      ], callback);
    }
  ], function(err) {

    var status = "ok";
    
    //check for known errors and replace the status
    if(err == "uploadFailed" || err == "convertFailed")
    {
      status = err;
      err = null;
    }

    ERR(err);
  
    //close the connection

    res.send("<script type='text/javascript' src='/static/js/jquery.js'></script><script> if ( (!$.browser.msie) && (!($.browser.mozilla && $.browser.version.indexOf(\"1.8.\") == 0)) ){document.domain = document.domain;}var impexp = window.top.require('/pad_impexp').padimpexp.handleFrameCall('" + status + "');</script>", 200);
  });
}
