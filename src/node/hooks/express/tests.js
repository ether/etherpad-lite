var path = require("path")
  , npm = require("npm")
  , fs = require("fs")
  , async = require("async");

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/tests/frontend/specs_list.js', function(req, res){

    async.parallel({
      coreSpecs: function(callback){
        exports.getCoreTests(callback);
      },
      pluginSpecs: function(callback){
        exports.getPluginTests(callback);
      }
    },
    function(err, results){
      var files = results.coreSpecs; // push the core specs to a file object
      files = files.concat(results.pluginSpecs); // add the plugin Specs to the core specs
      console.debug("Sent browser the following test specs:", files.sort());
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

exports.getPluginTests = function(callback){
  var pluginSpecs = [];
  var plugins = fs.readdirSync('node_modules');
  plugins.forEach(function(plugin){
    if(fs.existsSync("node_modules/"+plugin+"/static/tests/frontend/specs")){ // if plugins exists
      var specFiles = fs.readdirSync("node_modules/"+plugin+"/static/tests/frontend/specs/");
      async.forEach(specFiles, function(spec){ // for each specFile push it to pluginSpecs
         pluginSpecs.push("/static/plugins/"+plugin+"/static/tests/frontend/specs/" + spec);
      },
      function(err){
         // blow up if something bad happens!
      });
    }
  });
  callback(null, pluginSpecs);
}

exports.getCoreTests = function(callback){
  fs.readdir('tests/frontend/specs', function(err, coreSpecs){ // get the core test specs
    if(err){ return res.send(500); }
    callback(null, coreSpecs);
  });
}

