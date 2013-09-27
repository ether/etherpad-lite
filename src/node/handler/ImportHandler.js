/**
 * Handles the import requests
 */

/*
 * 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
 * 2012 Iván Eixarch
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
  , path = require("path")
  , settings = require('../utils/Settings')
  , formidable = require('formidable')
  , os = require("os")
  , importHtml = require("../utils/ImportHtml")
  , log4js = require('log4js');


//load abiword only if its enabled
if(settings.abiword != null)
  var abiword = require("../utils/Abiword");

//for node 0.6 compatibily, os.tmpDir() only works from 0.8
var tmpDirectory = process.env.TEMP || process.env.TMPDIR || process.env.TMP || '/tmp';
  
/**
 * do a requested import
 */ 
exports.doImport = function(req, res, padId)
{
  var apiLogger = log4js.getLogger("ImportHandler");

  //pipe to a file
  //convert file to html via abiword
  //set html in the pad
  
  var srcFile, destFile
    , pad
    , text;
  
  async.series([
    //save the uploaded file to /tmp
    function(callback) {
      var form = new formidable.IncomingForm();
      form.keepExtensions = true;
      form.uploadDir = tmpDirectory;
      
      form.parse(req, function(err, fields, files) { 
        //the upload failed, stop at this point
        if(err || files.file === undefined) {
          if(err) console.warn("Uploading Error: " + err.stack);
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
      var fileEnding = path.extname(srcFile).toLowerCase()
        , knownFileEndings = [".txt", ".doc", ".docx", ".pdf", ".odt", ".html", ".htm"]
        , fileEndingKnown = (knownFileEndings.indexOf(fileEnding) > -1);
      
      //if the file ending is known, continue as normal
      if(fileEndingKnown) {
        callback();
      }
      //we need to rename this file with a .txt ending
      else {
        var oldSrcFile = srcFile;
        srcFile = path.join(path.dirname(srcFile),path.basename(srcFile, fileEnding)+".txt");
        
        fs.rename(oldSrcFile, srcFile, callback);
      }
    },
    
    //convert file to html
    function(callback) {
      var randNum = Math.floor(Math.random()*0xFFFFFFFF);
      destFile = path.join(tmpDirectory, "eplite_import_" + randNum + ".htm");

      if (abiword) {
        abiword.convertFile(srcFile, destFile, "htm", function(err) {
          //catch convert errors
          if(err) {
            console.warn("Converting Error:", err);
            return callback("convertFailed");
          } else {
            callback();
          }
        });
      } else {
        // if no abiword only rename
        fs.rename(srcFile, destFile, callback);
      }
    },
    
    function(callback) {
      if (!abiword) {
        // Read the file with no encoding for raw buffer access.
        fs.readFile(destFile, function(err, buf) {
          if (err) throw err;
          var isAscii = true;
          // Check if there are only ascii chars in the uploaded file
          for (var i=0, len=buf.length; i<len; i++) {
            if (buf[i] > 240) {
              isAscii=false;
              break;
            }
          }
          if (isAscii) {
            callback();
          } else {
            callback("uploadFailed");
          }
        });
      } else {
        callback();
      }
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
        // Title needs to be stripped out else it appends it to the pad..
        text = text.replace("<title>", "<!-- <title>");
        text = text.replace("</title>-->");

        //node on windows has a delay on releasing of the file lock.  
        //We add a 100ms delay to work around this
        if(os.type().indexOf("Windows") > -1){
           setTimeout(function() {callback();}, 100);
        } else {
          callback();
        }
      });
    },
    
    //change text of the pad and broadcast the changeset
    function(callback) {
      var fileEnding = path.extname(srcFile).toLowerCase();
      if (abiword || fileEnding == ".htm" || fileEnding == ".html") {
        try{
          importHtml.setPadHTML(pad, text);
        }catch(e){
          apiLogger.warn("Error importing, possibly caused by malformed HTML");
        }
      } else {
        pad.setText(text);
      }
      padMessageHandler.updatePadClients(pad, callback);
    },
    
    //clean up temporary files
    function(callback) {
      //for node < 0.7 compatible
      var fileExists = fs.exists || path.exists;
      async.parallel([
        function(callback){
          fileExists (srcFile, function(exist) { (exist)? fs.unlink(srcFile, callback): callback(); });
        },
        function(callback){
          fileExists (destFile, function(exist) { (exist)? fs.unlink(destFile, callback): callback(); });
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
    res.send("<head><script type='text/javascript' src='../../static/js/jquery.js'></script><script type='text/javascript' src='../../static/js/jquery_browser.js'></script></head><script>$(window).load(function(){if ( (!$.browser.msie) && (!($.browser.mozilla && $.browser.version.indexOf(\"1.8.\") == 0)) ){document.domain = document.domain;}var impexp = window.parent.padimpexp.handleFrameCall('" + status + "');})</script>", 200);
  });
}

