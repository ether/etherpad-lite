const fs = require("fs");
const { exec } = require("child_process");

// get plugin name & path from user input
const pluginName = process.argv[2];
const pluginPath = "node_modules/"+pluginName;

// Should we autofix?
if (process.argv[3] && process.argv[3] === "autofix") var autoFix = true;

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
    if(autoFix) fs.writeFileSync("bin/plugins/lib/README.md", fs.readFileSync(pluginPath+"README.md", {encoding:'utf8', flag:'r'}));
  }

  if(files.indexOf("license.md") === -1){
    console.warn("LICENSE.md file not found, please create");
    // TODO: Describe use of this change
    if(autoFix){
      exec("git config user.name", (error, name, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.log(`stderr: ${stderr}`);
          return;
        }
        let license = fs.readFileSync("bin/plugins/lib/LICENSE.md", {encoding:'utf8', flag:'r'});
        license = license.replace("[yyyy]", new Date().getFullYear());
        license = license.replace("[name of copyright owner]", name)
        fs.writeFileSync(pluginPath+"/LICENSE.md", license);
      });
    }
  }

  if(files.indexOf(".travis.yml") === -1){
    console.warn(".travis.yml file not found, please create")
    // TODO: Describe use of this change
    if(autoFix){
      let travisConfig = fs.readFileSync("bin/plugins/lib/travis.yml", {encoding:'utf8', flag:'r'});
      console.log(travisConfig)
      travisConfig = travisConfig.replace(/\[plugin_name\]/g, pluginName);
      fs.writeFileSync(pluginPath+"/.travis.yml", travisConfig);
    }
  }

  if(files.indexOf(".gitignore") === -1){
    console.warn(".gitignore file not found, please create")
    // TODO: Describe use of this change
    if(autoFix){
      let gitignore = fs.readFileSync("bin/plugins/lib/gitignore", {encoding:'utf8', flag:'r'});
      fs.writeFileSync(pluginPath+"/.gitignore", gitignore);
    }
  }

  if(files.indexOf("locales") === -1){
    console.warn("Translations not found, please create");
    // TODO: Describe use of this change
  }


  if(files.indexOf(".ep_initialized") !== -1){
    console.warn(".ep_initialized found, please remove")
    // TODO: remember to git rm the file!
    if(autoFix) fs.unlinkSync(pluginPath+"/.ep_initialized");
  }

  if(files.indexOf("npm-debug.log") !== -1){
    // TODO: remember to git rm the file!
    console.warn("npm-debug.log found, please remove")
    if(autoFix) fs.unlinkSync(pluginPath+"/npm-debug.log");
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
