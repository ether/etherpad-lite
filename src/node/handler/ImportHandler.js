/**
 * Handles the import requests
 */

/*
 * 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
 * 2012 Iván Eixarch
 * 2014 John McLear (Etherpad Foundation / McLear Ltd)
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
  , importEtherpad = require("../utils/ImportEtherpad")
  , log4js = require("log4js")
  , hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks.js");

var convertor = null;
var exportExtension = "htm";

//load abiword only if its enabled and if soffice is disabled
if(settings.abiword != null && settings.soffice === null)
  convertor = require("../utils/Abiword");

//load soffice only if its enabled
if(settings.soffice != null) {
  convertor = require("../utils/LibreOffice");
  exportExtension = "html";
}

//for node 0.6 compatibily, os.tmpDir() only works from 0.8
var tmpDirectory = process.env.TEMP || process.env.TMPDIR || process.env.TMP || '/tmp';
  
/**
 * do a requested import
 */ 
exports.doImport = function(req, res, padId)
{
  var apiLogger = log4js.getLogger("ImportHandler");

  //pipe to a file
  //convert file to html via abiword or soffice
  //set html in the pad
  
  var srcFile, destFile
    , pad
    , text
    , importHandledByPlugin
    , directDatabaseAccess
    , useConvertor;

  var randNum = Math.floor(Math.random()*0xFFFFFFFF);
  
  // setting flag for whether to use convertor or not
  useConvertor = (convertor != null);

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

          return;
        }

        //everything ok, continue
        //save the path of the uploaded file
        srcFile = files.file.path;
        callback();
      });
    },
    
    //ensure this is a file ending we know, else we change the file ending to .txt
    //this allows us to accept source code files like .c or .java
    function(callback) {
      var fileEnding = path.extname(srcFile).toLowerCase()
        , knownFileEndings = [".txt", ".doc", ".docx", ".pdf", ".odt", ".html", ".htm", ".etherpad", ".rtf"]
        , fileEndingKnown = (knownFileEndings.indexOf(fileEnding) > -1);
      
      //if the file ending is known, continue as normal
      if(fileEndingKnown) {
        callback();
        
        return;
      }

      //we need to rename this file with a .txt ending
      if(settings.allowUnknownFileEnds === true){
        var oldSrcFile = srcFile;
        srcFile = path.join(path.dirname(srcFile),path.basename(srcFile, fileEnding)+".txt");
        fs.rename(oldSrcFile, srcFile, callback);
      }else{
        console.warn("Not allowing unknown file type to be imported", fileEnding);
        callback("uploadFailed");
      }
    },
    function(callback){
      destFile = path.join(tmpDirectory, "etherpad_import_" + randNum + "." + exportExtension);

      // Logic for allowing external Import Plugins
      hooks.aCallAll("import", {srcFile: srcFile, destFile: destFile}, function(err, result){
        if(ERR(err, callback)) return callback();
        if(result.length > 0){ // This feels hacky and wrong..
          importHandledByPlugin = true;
        }
        callback();
      });
    },
    function(callback) {
      var fileEnding = path.extname(srcFile).toLowerCase()
      var fileIsNotEtherpad = (fileEnding !== ".etherpad");

      if (fileIsNotEtherpad) {
        callback();

        return;
      }

      // we do this here so we can see if the pad has quit ea few edits
      padManager.getPad(padId, function(err, _pad){
        var headCount = _pad.head;
        if(headCount >= 10){
          apiLogger.warn("Direct database Import attempt of a pad that already has content, we wont be doing this")
          return callback("padHasData");
        }

        fs.readFile(srcFile, "utf8", function(err, _text){
          directDatabaseAccess = true;
          importEtherpad.setPadRaw(padId, _text, function(err){
            callback();
          });
        });
      });
    },
    //convert file to html
    function(callback) {
      if (importHandledByPlugin || directDatabaseAccess) {
        callback();

        return;
      }

      var fileEnding = path.extname(srcFile).toLowerCase();
      var fileIsHTML = (fileEnding === ".html" || fileEnding === ".htm");
      var fileIsTXT = (fileEnding === ".txt");
      if (fileIsTXT) useConvertor = false; // Don't use convertor for text files
      // See https://github.com/ether/etherpad-lite/issues/2572
      if (fileIsHTML || (useConvertor === false)) {
        // if no convertor only rename
        fs.rename(srcFile, destFile, callback);
        
        return;
      }

      convertor.convertFile(srcFile, destFile, exportExtension, function(err) {
        //catch convert errors
        if(err) {
          console.warn("Converting Error:", err);
          return callback("convertFailed");
        }

        callback();
      });
    },
    
    function(callback) {
      if (useConvertor || directDatabaseAccess) {
        callback();

        return;
      }

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

        if (!isAscii) {
          callback("uploadFailed");

          return;
        }

        callback();
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
      if (directDatabaseAccess) {
        callback();

        return;
      }

      fs.readFile(destFile, "utf8", function(err, _text){
        if(ERR(err, callback)) return;
        text = _text;
        // Title needs to be stripped out else it appends it to the pad..
        text = text.replace("<title>", "<!-- <title>");
        text = text.replace("</title>","</title>-->");

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
      if(!directDatabaseAccess){
        var fileEnding = path.extname(srcFile).toLowerCase();
        if (importHandledByPlugin || useConvertor || fileEnding == ".htm" || fileEnding == ".html") {
          importHtml.setPadHTML(pad, text, function(e){
            if(e) apiLogger.warn("Error importing, possibly caused by malformed HTML");
          });
        } else {
          pad.setText(text);
        }
      }

      // Load the Pad into memory then brodcast updates to all clients
      padManager.unloadPad(padId);
      padManager.getPad(padId, function(err, _pad){
        var pad = _pad;
        padManager.unloadPad(padId);
        // direct Database Access means a pad user should perform a switchToPad
        // and not attempt to recieve updated pad data..
        if (directDatabaseAccess) {
          callback();

          return;
        }

        padMessageHandler.updatePadClients(pad, function(){
          callback();
        });
      });

    },
    
    //clean up temporary files
    function(callback) {
      if (directDatabaseAccess) {
        callback();

        return;
      }

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
    if(err == "uploadFailed" || err == "convertFailed" || err == "padHasData")
    {
      status = err;
      err = null;
    }

    ERR(err);

    //close the connection
    res.send(
      "<head> \
        <script type='text/javascript' src='../../static/js/jquery.js'></script> \
      </head> \
      <script> \
        $(window).load(function(){ \
          var impexp = window.parent.padimpexp.handleFrameCall('" + directDatabaseAccess +"', '" + status + "'); \
        }) \
      </script>"
    );
  });
}

