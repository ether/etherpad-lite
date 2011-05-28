var settings = require('./settings');
var async = require('async');
var fs = require('fs');
var cleanCSS = require('clean-css');
var jsp = require("uglify-js").parser;
var pro = require("uglify-js").uglify;
var path = require('path');
var Buffer = require('buffer').Buffer;
var gzip = require('gzip');

/**
 * Answers a http request for the pad javascript
 */
exports.padJS = function(req, res)
{
  res.header("Content-Type","text/javascript");

  var jsFiles = ["plugins.js", "undo-xpopup.js", "json2.js", "pad_utils.js", "pad_cookie.js", "pad_editor.js", "pad_editbar.js", "pad_docbar.js", "pad_modals.js", "ace.js", "collab_client.js", "pad_userlist.js", "pad_impexp.js", "pad_savedrevs.js", "pad_connectionstatus.js", "pad2.js"];
  
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
            if(err) { callback(err); return; }
            
            //we wanna check the directory itself for changes too
            files.push(".");
            
            //go trough all files in this folder
            async.forEach(files, function(filename, callback) 
            {
              //get the stat data of this file
              fs.stat(path + "/" + filename, function(err, stats)
              {
                if(err) { callback(err); return; }
              
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
        fs.stat("../var/minified_pad.js", function(err, stats)
        {
          if(err && err.code != "ENOENT") callback(err);
        
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
            fileValues[item] = data;
            callback(err);
          });
        }, callback);
      },
      //find all includes in ace.js and embed them 
      function(callback)
      {        
        var founds = fileValues["ace.js"].match(/\$\$INCLUDE_[a-zA-Z_]+\([a-zA-Z0-9.\/_"]+\)/gi);
        
        //go trough all includes
        async.forEach(founds, function (item, callback)
        {
          var filename = item.match(/"[^"]*"/g)[0].substr(1);
          filename = filename.substr(0,filename.length-1);
        
          var type = item.match(/INCLUDE_[A-Z]+/g)[0].substr("INCLUDE_".length);
        
          var quote = item.search("_Q") != -1;
        
          //read the included file
          fs.readFile(".." + filename, "utf-8", function(err, data)
          {         
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
            
            callback(err);
          });
        }, function(err)
        {
          //replace the include command with the include
          for(var i in embeds)
          {
            fileValues["ace.js"]=fileValues["ace.js"].replace(i, embeds[i]);
          }
          
          callback(err);
        });
      },
      //put all together and write it into a file
      function(callback)
      {
        //put all javascript files in an array
        var values = [];
        for(var i in fileValues)
        {
          values.push(fileValues[i]);
        }
        
        //minify all javascript files to one
        var result = compressJS(values);
        
        async.parallel([
          //write the results plain in a file
          function(callback)
          {
            fs.writeFile("../var/minified_pad.js", result, "utf8", callback);  
          },
          //write the results compressed in a file
          function(callback)
          {
            gzip(result, 9, function(err, compressedResult){
              if(err) {callback(err); return}
              
              fs.writeFile("../var/minified_pad.js.gz", compressedResult, callback);  
            });
          }
        ],callback);
      }
    ], function(err)
    {
      if(err && err != "stop") throw err;
      
      //check if gzip is supported by this browser
      var gzipSupport = req.header('Accept-Encoding', '').indexOf('gzip') != -1;
      
      var pathStr;
      if(gzipSupport)
      {
        pathStr = path.normalize(__dirname + "/../var/minified_pad.js.gz");
        res.header('Content-Encoding', 'gzip');
      }
      else
      {
        pathStr = path.normalize(__dirname + "/../var/minified_pad.js");
      }
      
      res.sendfile(pathStr);
    })
  }
  //minifying is disabled, so load the files with jquery
  else
  {
    for(var i in jsFiles)
    {
      res.write("$.getScript('/static/js/" + jsFiles[i]+ "');\n");
    }
    
    res.end();
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
