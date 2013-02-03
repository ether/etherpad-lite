var path = require("path")
  , npm = require("npm")
  , fs = require("fs");

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/tests/frontend/specs_list.js', function(req, res){
    fs.readdir('tests/frontend/specs', function(err, files){

      fs.readdir('node_modules', function(err, plugins){ // installed plugins
        plugins.forEach(function(plugin){ // for each one
          if(fs.existsSync("node_modules/"+plugin+"/tests/frontend/specs")){ // If the folder exists
            fs.readdir("node_modules/"+plugin+"/tests/frontend/specs/", function(err, pluginFiles){
              files.push(pluginFiles);
            });
          }
        });
      });

      if(err){ return res.send(500); }

      res.send("var specs_list = " + JSON.stringify(files.sort()) + ";\n"); 
    });
  });

  var url2FilePath = function(url){
    var subPath = url.substr("/tests/frontend".length);
    if (subPath == ""){
      subPath = "index.html"
    }
    subPath = subPath.split("?")[0];

    var filePath = path.normalize(npm.root + "/../tests/frontend/")
    filePath += subPath.replace("..", "");
    return filePath;
  }

  args.app.get('/tests/frontend/specs/*', function (req, res) {
    var specFilePath = url2FilePath(req.url);
    var specFileName = path.basename(specFilePath);

    fs.readFile(specFilePath, function(err, content){
      if(err){ return res.send(500); }
   
      content = "describe(" + JSON.stringify(specFileName) + ", function(){   " + content + "   });";

      res.send(content);
    }); 
  });

  args.app.get('/tests/frontend/*', function (req, res) {
    var filePath = url2FilePath(req.url);
    res.sendfile(filePath);
  });

  args.app.get('/tests/frontend', function (req, res) {
    res.redirect('/tests/frontend/');
  }); 
}
