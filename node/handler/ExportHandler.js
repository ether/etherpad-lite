/**
 * Handles the export requests
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

var exporthtml = require("./exporters/exporthtml");
var padManager = require("./PadManager");
var async = require("async");
var fs = require("fs");
var settings = require('./settings');

//load abiword only if its enabled
if(settings.abiword != null)
  var abiword = require("./Abiword");

/**
 * do a requested export
 */ 
exports.doExport = function(req, res, padId, type)
{
  //tell the browser that this is a downloadable file
  res.attachment(padId + "." + type);

  //if this is a plain text export, we can do this directly
  if(type == "txt")
  {
    padManager.getPad(padId, function(err, pad)
    {
      if(err)
        throw err;
         
      res.send(pad.text());
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
        exporthtml.getPadHTMLDocument(padId, null, false, function(err, _html)
        {
          html = _html;
          callback(err);
        });   
      },
      //decide what to do with the html export
      function(callback)
      {
        //if this is a html export, we can send this from here directly
        if(type == "html")
        {
          res.send(html);
          callback("stop");  
        }
        //write the html export to a file
        else
        {
          randNum = Math.floor(Math.random()*new Date().getTime());
          srcFile = "/tmp/eplite_export_" + randNum + ".html";
          fs.writeFile(srcFile, html, callback); 
        }
      },
      //send the convert job to abiword
      function(callback)
      {
        //ensure html can be collected by the garbage collector
        html = null;
      
        destFile = "/tmp/eplite_export_" + randNum + "." + type;
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
            fs.unlink(destFile, callback);
          }
        ], callback);
      }
    ], function(err)
    {
      if(err && err != "stop") throw err;
    })
  }
};
