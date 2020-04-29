var path = require("path")
  , npm = require("npm")
  , fs = require("fs")
  , util = require("util");

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/tests/frontend/specs_list.js', async function(req, res) {
    let [coreTests, pluginTests] = await Promise.all([
      exports.getCoreTests(),
      exports.getPluginTests()
    ]);

    // merge the two sets of results
    let files = [].concat(coreTests, pluginTests).sort();

    // Remove swap files from tests
    files = files.filter(el => !/\.swp$/.test(el))

    console.debug("Sent browser the following test specs:", files);
    res.send("var specs_list = " + JSON.stringify(files) + ";\n");
  });

  // path.join seems to normalize by default, but we'll just be explicit
  var rootTestFolder = path.normalize(path.join(npm.root, "../tests/frontend/"));

  var url2FilePath = function(url) {
    var subPath = url.substr("/tests/frontend".length);
    if (subPath == "") {
      subPath = "index.html"
    }
    subPath = subPath.split("?")[0];

    var filePath = path.normalize(path.join(rootTestFolder, subPath));

    // make sure we jail the paths to the test folder, otherwise serve index
    if (filePath.indexOf(rootTestFolder) !== 0) {
      filePath = path.join(rootTestFolder, "index.html");
    }
    return filePath;
  }

  args.app.get('/tests/frontend/specs/*', function (req, res) {
    var specFilePath = url2FilePath(req.url);
    var specFileName = path.basename(specFilePath);

    fs.readFile(specFilePath, function(err, content) {
      if (err) { return res.send(500); }

      content = "describe(" + JSON.stringify(specFileName) + ", function(){   " + content + "   });";

      res.send(content);
    });
  });

  args.app.get('/tests/frontend/*', function (req, res) {
    var filePath = url2FilePath(req.url);
    res.sendFile(filePath);
  });

  args.app.get('/tests/frontend', function (req, res) {
    res.redirect('/tests/frontend/index.html');
  });
}

const readdir = util.promisify(fs.readdir);

exports.getPluginTests = async function(callback) {
  const moduleDir = "node_modules/";
  const specPath = "/static/tests/frontend/specs/";
  const staticDir = "/static/plugins/";

  let pluginSpecs = [];

  let plugins = await readdir(moduleDir);
  let promises = plugins
    .map(plugin => [ plugin, moduleDir + plugin + specPath] )
    .filter(([plugin, specDir]) => fs.existsSync(specDir)) // check plugin exists
    .map(([plugin, specDir]) => {
      return readdir(specDir)
        .then(specFiles => specFiles.map(spec => {
          pluginSpecs.push(staticDir + plugin + specPath + spec);
        }));
    });

  return Promise.all(promises).then(() => pluginSpecs);
}

exports.getCoreTests = function() {
  // get the core test specs
  return readdir('tests/frontend/specs');
}
