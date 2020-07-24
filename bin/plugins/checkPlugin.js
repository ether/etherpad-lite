const fs = require("fs");

// get plugin name from user input
const pluginName = process.argv[2];
const pluginPath = "node_modules/"+pluginName;

fs.readdir(pluginPath, function (err, rootFiles) {
   var files = [];
   for (var i = 0; i < rootFiles.length; i++) {
     files.push(rootFiles[i].toLowerCase());
   }

    //handling error
    if (err) {
      return console.log('Unable to scan directory: ' + err);
    }

    if(files.indexOf("readme.md") === -1){
      console.warn("README.md file not found, please create");
      // TODO: Describe use of this change
      // TODO: Provide template / example README.
    }

    if(files.indexOf("license.md") === -1){
      console.warn("LICENSE.md file not found, please create");
      // TODO: Describe use of this change
      // TODO: Offer to include Apache 2 license
      // TODO: a2 license would need attribution afaik
    }

    if(files.indexOf(".travis.yml") === -1){
      console.warn(".travis.yml file not found, please create")
      // TODO: Describe use of this change
      // TODO: Offer to create a .travis config
    }

    if(files.indexOf("locales") === -1){
      console.warn("Translations not found, please create");
      // TODO: Describe use of this change
    }

    if(files.indexOf(".gitignore") === -1){
      // TODO: Offer to create a .gitignore file
      console.warn(".gitignore not found, please create")
    }

    if(files.indexOf(".ep_initialized") !== -1){
      // TODO: Offer to remove the file
      // TODO: remember to git rm the file!
      console.warn(".ep_initialized found, please remove")
    }

    if(files.indexOf("npm-debug.log") !== -1){
      // TODO: Offer to remove the file
      // TODO: remember to git rm the file!
      console.warn("npm-debug.log found, please remove")
    }

    if(files.indexOf("static") !== -1){
      fs.readdir(pluginPath+"/static", function (err, staticFiles) {
        if(staticFiles.indexOf("tests") === -1){
          // TODO: Describe use of this change
          console.warn("test files not found, please create")
        }
      })
    }


    //listing all files using forEach
    files.forEach(function (file) {
        // Do whatever you want to do with the file
        // console.log(file.toLowerCase());
    });
});
