/**
 * Handles the export requests
 */

/*
 * 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
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

var ERR = require("async-stacktrace");
var exporthtml = require("../utils/ExportHtml");
var exporttxt = require("../utils/ExportTxt");
var exportEtherpad = require("../utils/ExportEtherpad");
var async = require("async");
var fs = require("fs");
var settings = require('../utils/Settings');
var os = require('os');
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");

//load abiword only if its enabled
if(settings.abiword != null)
  var abiword = require("../utils/Abiword");

var tempDirectory = "/tmp";

//tempDirectory changes if the operating system is windows 
if(os.type().indexOf("Windows") > -1)
{
  tempDirectory = process.env.TEMP;
}
  
/**
 * do a requested export
 */ 
exports.doExport = function(req, res, padId, type)
{
  var fileName = padId;

  // allow fileName to be overwritten by a hook, the type type is kept static for security reasons
  hooks.aCallFirst("exportFileName", padId, 
    function(err, hookFileName){
      // if fileName is set then set it to the padId, note that fileName is returned as an array.
      if(hookFileName.length) fileName = hookFileName;

      //tell the browser that this is a downloadable file
      res.attachment(fileName + "." + type);
    
      //if this is a plain text export, we can do this directly
      // We have to over engineer this because tabs are stored as attributes and not plain text
      if(type == "etherpad"){
        exportEtherpad.getPadRaw(padId, function(err, pad){
          if(!err){
            res.send(pad);
            // return;
          }
        });
      }
      else if(type == "txt")
      {
        var txt;
        var randNum;
        var srcFile, destFile;
    
        async.series([
          //render the txt document
          function(callback)
          {
            exporttxt.getPadTXTDocument(padId, req.params.rev, false, function(err, _txt)
            {
              if(ERR(err, callback)) return;
              txt = _txt;
              callback();
            });
          },
          //decide what to do with the txt export
          function(callback)
          {
            //if this is a txt export, we can send this from here directly
            res.send(txt);
            callback("stop");
          },
          //send the convert job to abiword
          function(callback)
          {
            //ensure html can be collected by the garbage collector
            txt = null;
    
            destFile = tempDirectory + "/etherpad_export_" + randNum + "." + type;
            abiword.convertFile(srcFile, destFile, type, callback);
          },
          //send the file
          function(callback)
          {
            res.sendfile(destFile, null, callback);
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
                //100ms delay to accomidate for slow windows fs
                if(os.type().indexOf("Windows") > -1)
                {
                  setTimeout(function()
                  {
                    fs.unlink(destFile, callback);
                  }, 100);
                }
                else
                {
                  fs.unlink(destFile, callback);
                }
              }
            ], callback);
          }
        ], function(err)
        {
          if(err && err != "stop") ERR(err);
        })
      }
      else
      {
        var html;
        var randNum;
        var srcFile, destFile;
    
        async.series([
          //render the html document
          function(callback)
          {
            exporthtml.getPadHTMLDocument(padId, req.params.rev, false, function(err, _html)
            {
              if(ERR(err, callback)) return;
              html = _html;
              callback();
            });   
          },
          //decide what to do with the html export
          function(callback)
          {
            //if this is a html export, we can send this from here directly
            if(type == "html")
            {
              // do any final changes the plugin might want to make cake
              hooks.aCallFirst("exportHTMLSend", html, function(err, newHTML){
                if(newHTML.length) html = newHTML;
                res.send(html);
                callback("stop");  
              });
            }
            else //write the html export to a file
            {
              randNum = Math.floor(Math.random()*0xFFFFFFFF);
              srcFile = tempDirectory + "/etherpad_export_" + randNum + ".html";
              fs.writeFile(srcFile, html, callback); 
            }
          },
          //send the convert job to abiword
          function(callback)
          {
            //ensure html can be collected by the garbage collector
            html = null;
          
            destFile = tempDirectory + "/etherpad_export_" + randNum + "." + type;
            abiword.convertFile(srcFile, destFile, type, callback);
          },
          //send the file
          function(callback)
          {
            res.sendfile(destFile, null, callback);
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
                //100ms delay to accomidate for slow windows fs
                if(os.type().indexOf("Windows") > -1)
                {
                  setTimeout(function() 
                  {
                    fs.unlink(destFile, callback);
                  }, 100);
                }
                else
                {
                  fs.unlink(destFile, callback);
                }
              }
            ], callback);
          }
        ], function(err)
        {
          if(err && err != "stop") ERR(err);
        })
      }
    }
  );
};
