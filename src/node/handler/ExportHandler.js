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
var TidyHtml = require('../utils/TidyHtml');

var convertor = null;

//load abiword only if its enabled
if(settings.abiword != null)
  convertor = require("../utils/Abiword");

// Use LibreOffice if an executable has been defined in the settings
if(settings.soffice != null)
  convertor = require("../utils/LibreOffice");

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
        exporttxt.getPadTXTDocument(padId, req.params.rev, false, function(err, txt)
        {
          if(ERR(err)) return;
          res.send(txt);
        });
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
              // do any final changes the plugin might want to make
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

          // Tidy up the exported HTML
          function(callback)
          {
            //ensure html can be collected by the garbage collector
            html = null;

            TidyHtml.tidy(srcFile, callback);
          },

          //send the convert job to the convertor (abiword, libreoffice, ..)
          function(callback)
          {
            destFile = tempDirectory + "/etherpad_export_" + randNum + "." + type;

            // Allow plugins to overwrite the convert in export process
            hooks.aCallAll("exportConvert", {srcFile: srcFile, destFile: destFile, req: req, res: res}, function(err, result){
              if(!err && result.length > 0){
                // console.log("export handled by plugin", destFile);
                handledByPlugin = true;
                callback();
              }else{
                convertor.convertFile(srcFile, destFile, type, callback);
              }
            });

          },
          //send the file
          function(callback)
          {
            res.sendFile(destFile, null, callback);
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
