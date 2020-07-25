const fs = require("fs");
const { exec } = require("child_process");

// get plugin name & path from user input
const pluginName = process.argv[2];
const pluginPath = "node_modules/"+pluginName;

// Should we autofix?
if (process.argv[3] && process.argv[3] === "autofix") var autoFix = true;

fs.readdir(pluginPath, function (err, rootFiles) {
  //handling error
  if (err) {
    return console.log('Unable to scan directory: ' + err);
  }

  // rewriting files to lower case
  var files = [];

  // some files we need to know the actual file name.  Not compulsory but might help in the future.
  var readMeFileName;
  var repository;
  var hasAutofixed = false;

  for (var i = 0; i < rootFiles.length; i++) {
    if(rootFiles[i].toLowerCase().indexOf("readme") !== -1) readMeFileName = rootFiles[i];
    files.push(rootFiles[i].toLowerCase());
  }

  if(files.indexOf("package.json") === -1){
    console.warn("no package.json, please create");
  }

  if(files.indexOf("package.json") !== -1){
    let package = fs.readFileSync(pluginPath+"/package.json", {encoding:'utf8', flag:'r'});
    if(package.toLowerCase().indexOf("repository") === -1){
      console.warn("No repository in package.json");
      if(autoFix){
        autoFix = true;
        console.warn("Repository not detected in package.json.  Please add repository section manually.")
      }
    }else{
      repository = JSON.parse(package).repository.url;
    }
  }

  if(files.indexOf("readme.md") === -1){
    console.warn("README.md file not found, please create");
    // TODO: Describe use of this change
    // TODO: Provide template / example README.
    if(autoFix){
      autoFix = true;
      console.log("Autofixing missing README.md file");
      let readme = fs.readFileSync("bin/plugins/lib/README.md", {encoding:'utf8', flag:'r'})
      readme = readme.replace(/\[plugin_name\]/g, pluginName);
      let org = repository.split("/")[3];
      let name = repository.split("/")[4];
      readme = readme.replace(/\[org_name\]/g, org);
      readme = readme.replace(/\[repo_url\]/g, name);
      fs.writeFileSync(pluginPath+"/README.md", readme);
    }
  }

  if(files.indexOf("readme.md") !== -1){
    let readme = fs.readFileSync(pluginPath+"/"+readMeFileName, {encoding:'utf8', flag:'r'});
    if(readme.toLowerCase().indexOf("license") === -1){
      console.warn("No license section in README");
      if(autoFix){
        console.warn("Please add License section to README manually.")
      }
    }
  }

  if(files.indexOf("license.md") === -1){
    console.warn("LICENSE.md file not found, please create");
    // TODO: Describe use of this change
    if(autoFix){
      autoFix = true;
      console.log("Autofixing missing LICENSE.md file");
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
      autoFix = true;
      console.log("Autofixing missing .travis.yml file");
      let travisConfig = fs.readFileSync("bin/plugins/lib/travis.yml", {encoding:'utf8', flag:'r'});
      console.log(travisConfig)
      travisConfig = travisConfig.replace(/\[plugin_name\]/g, pluginName);
      fs.writeFileSync(pluginPath+"/.travis.yml", travisConfig);
      console.log("Travis file created, please sign into travis and enable this repository")
    }
  }

  if(files.indexOf(".gitignore") === -1){
    console.warn(".gitignore file not found, please create")
    // TODO: Describe use of this change
    if(autoFix){
      autoFix = true;
      console.log("Autofixing missing .gitignore file");
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
    if(autoFix){
      autoFix = true;
      console.log("Autofixing incorrectly existing .ep_initialized file");
      fs.unlinkSync(pluginPath+"/.ep_initialized");
    }
  }

  if(files.indexOf("npm-debug.log") !== -1){
    // TODO: remember to git rm the file!
    console.warn("npm-debug.log found, please remove")
    if(autoFix){
      autoFix = true;
      console.log("Autofixing incorrectly existing npm-debug.log file");
      fs.unlinkSync(pluginPath+"/npm-debug.log");
    }
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
