/**
 * This Module manages all /minified/* requests. It controls the
 * minification && compression of Javascript and CSS.
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

var ERR = require("async-stacktrace");
var settings = require('./Settings');
var async = require('async');
var fs = require('fs');
var cleanCSS = require('clean-css');
var jsp = require("uglify-js").parser;
var pro = require("uglify-js").uglify;
var path = require('path');
var Buffer = require('buffer').Buffer;
var zlib = require('zlib');
var server = require('../server');
var os = require('os');

var padJS = ["jquery.min.js", "pad_utils.js", "plugins.js", "undo-xpopup.js", "json2.js", "pad_cookie.js", "pad_editor.js", "pad_editbar.js", "pad_docbar.js", "pad_modals.js", "ace.js", "collab_client.js", "pad_userlist.js", "pad_impexp.js", "pad_savedrevs.js", "pad_connectionstatus.js", "pad2.js", "jquery-ui.js", "chat.js", "excanvas.js", "farbtastic.js"];

var timesliderJS = ["jquery.min.js", "plugins.js", "undo-xpopup.js", "json2.js", "colorutils.js", "draggable.js", "pad_utils.js", "pad_cookie.js", "pad_editor.js", "pad_editbar.js", "pad_docbar.js", "pad_modals.js", "easysync2_client.js", "domline_client.js", "linestylefilter_client.js", "cssmanager_client.js", "broadcast.js", "broadcast_slider.js", "broadcast_revisions.js"];

/**
 * creates the minifed javascript for the given minified name
 * @param req the Express request
 * @param res the Express response
 */
exports.minifyJS = function(req, res, jsFilename)
{
  res.header("Content-Type","text/javascript");

  //choose the js files we need
  if(jsFilename == "pad.js")
  {
    jsFiles = padJS;
  }
  else if(jsFilename == "timeslider.js")
  {
    jsFiles = timesliderJS;
  }
  else
  {
    throw new Error("there is no profile for creating " + name);
  }

  //minifying is enabled
  if(settings.minify)
  {
    var fileValues = {};
    var embeds = {};
    var latestModification = 0;

    async.series([
      //find out the highest modification date
      function(callback)
      {
        var folders2check = ["../static/css","../static/js"];

        //go trough this two folders
        async.forEach(folders2check, function(path, callback)
        {
          //read the files in the folder
          fs.readdir(path, function(err, files)
          {
            if(ERR(err, callback)) return;

            //we wanna check the directory itself for changes too
            files.push(".");

            //go trough all files in this folder
            async.forEach(files, function(filename, callback)
            {
              //get the stat data of this file
              fs.stat(path + "/" + filename, function(err, stats)
              {
                if(ERR(err, callback)) return;

                //get the modification time
                var modificationTime = stats.mtime.getTime();

                //compare the modification time to the highest found
                if(modificationTime > latestModification)
                {
                  latestModification = modificationTime;
                }

                callback();
              });
            }, callback);
          });
        }, callback);
      },
      function(callback)
      {
        //check the modification time of the minified js
        fs.stat("../var/minified_" + jsFilename, function(err, stats)
        {
          if(err && err.code != "ENOENT")
          {
            ERR(err, callback);
            return;
          }

          //there is no minfied file or there new changes since this file was generated, so continue generating this file
          if((err && err.code == "ENOENT") || stats.mtime.getTime() < latestModification)
          {
            callback();
          }
          //the minified file is still up to date, stop minifying
          else
          {
            callback("stop");
          }
        });
      },
      //load all js files
      function (callback)
      {
        async.forEach(jsFiles, function (item, callback)
        {
          fs.readFile("../static/js/" + item, "utf-8", function(err, data)
          {
            if(ERR(err, callback)) return;
            fileValues[item] = data;
            callback();
          });
        }, callback);
      },
      //find all includes in ace.js and embed them
      function(callback)
      {
        //if this is not the creation of pad.js, skip this part
        if(jsFilename != "pad.js")
        {
          callback();
          return;
        }

        var founds = fileValues["ace.js"].match(/\$\$INCLUDE_[a-zA-Z_]+\([a-zA-Z0-9.\/_"]+\)/gi);

        //go trough all includes
        async.forEach(founds, function (item, callback)
        {
          var filename = item.match(/"[^"]*"/g)[0].substr(1);
          filename = filename.substr(0,filename.length-1);

          var type = item.match(/INCLUDE_[A-Z]+/g)[0].substr("INCLUDE_".length);

          var quote = item.search("_Q") != -1;

          //read the included file
          fs.readFile(filename, "utf-8", function(err, data)
          {
            if(ERR(err, callback)) return;

            //compress the file
            if(type == "JS")
            {
              embeds[item] = "<script>\n" + compressJS([data])+ "\n\\x3c/script>";
            }
            else
            {
              embeds[item] = "<style>" + compressCSS([data])+ "</style>";
            }

            //do the first escape
            embeds[item] = JSON.stringify(embeds[item]).replace(/'/g, "\\'").replace(/\\"/g, "\"");
            embeds[item] = embeds[item].substr(1);
            embeds[item] = embeds[item].substr(0, embeds[item].length-1);

            //add quotes, if wished
            if(quote)
            {
              embeds[item] = "'" + embeds[item] + "'";
            }

            //do the second escape
            embeds[item] = JSON.stringify(embeds[item]).replace(/'/g, "\\'").replace(/\"/g, "\"");
            embeds[item] = embeds[item].substr(1);
            embeds[item] = embeds[item].substr(0, embeds[item].length-1);
            embeds[item] = "'" + embeds[item] + "'";

            callback();
          });
        }, function(err)
        {
          if(ERR(err, callback)) return;

          //replace the include command with the include
          for(var i in embeds)
          {
            fileValues["ace.js"]=fileValues["ace.js"].replace(i, embeds[i]);
          }

          callback();
        });
      },
      //put all together and write it into a file
      function(callback)
      {
        //put all javascript files in an array
        var values = [];
        for(var i in jsFiles)
        {
          values.push(fileValues[jsFiles[i]]);
        }

        //minify all javascript files to one
        var result = compressJS(values);

        async.parallel([
          //write the results plain in a file
          function(callback)
          {
            fs.writeFile("../var/minified_" + jsFilename, result, "utf8", callback);
          },
          //write the results compressed in a file
          function(callback)
          {
            zlib.gzip(result, function(err, compressedResult){

              if(ERR(err, callback)) return;

              fs.writeFile("../var/minified_" + jsFilename + ".gz", compressedResult, callback);
            });
          }
        ],callback);
      }
    ], function(err)
    {
      if(err && err != "stop")
      {
        if(ERR(err)) return;
      }

      //check if gzip is supported by this browser
      var gzipSupport = req.header('Accept-Encoding', '').indexOf('gzip') != -1;

      var pathStr;
      if(gzipSupport && os.type().indexOf("Windows") == -1)
      {
        pathStr = path.normalize(__dirname + "/../../var/minified_" + jsFilename + ".gz");
        res.header('Content-Encoding', 'gzip');
      }
      else
      {
        pathStr = path.normalize(__dirname + "/../../var/minified_" + jsFilename );
      }

      res.sendfile(pathStr, { maxAge: server.maxAge });
    })
  }
  //minifying is disabled, so put the files together in one file
  else
  {
    var fileValues = {};

    //read all js files
    async.forEach(jsFiles, function (item, callback)
    {
      fs.readFile("../static/js/" + item, "utf-8", function(err, data)
      {
        if(ERR(err, callback)) return;
        fileValues[item] = data;
        callback();
      });
    },
    //send all files together
    function(err)
    {
      if(ERR(err)) return;

      for(var i=0;i<jsFiles.length;i++)
      {
        var fileName = jsFiles[i];
        res.write("\n\n\n/*** File: static/js/" + fileName + " ***/\n\n\n");
        res.write(fileValues[fileName]);
      }

      res.end();
    });
  }
}

function compressJS(values)
{
  var complete = values.join("\n");
  var ast = jsp.parse(complete); // parse code and get the initial AST
  ast = pro.ast_mangle(ast); // get a new AST with mangled names
  ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
  return pro.gen_code(ast); // compressed code here
}

function compressCSS(values)
{
  var complete = values.join("\n");
  return cleanCSS.process(complete);
}
