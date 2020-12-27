const path = require('path');
const npm = require('npm');
const fs = require('fs');
const util = require('util');

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/tests/frontend/specs_list.js', async (req, res) => {
    const [coreTests, pluginTests] = await Promise.all([
      exports.getCoreTests(),
      exports.getPluginTests(),
    ]);

    // merge the two sets of results
    let files = [].concat(coreTests, pluginTests).sort();

    // Keep only *.js files
    files = files.filter((f) => f.endsWith('.js'));

    console.debug('Sent browser the following test specs:', files);
    res.setHeader('content-type', 'application/javascript');
    res.end(`var specs_list = ${JSON.stringify(files)};\n`);
  });

  // path.join seems to normalize by default, but we'll just be explicit
  const rootTestFolder = path.normalize(path.join(npm.root, '../tests/frontend/'));

  const url2FilePath = function (url) {
    let subPath = url.substr('/tests/frontend'.length);
    if (subPath == '') {
      subPath = 'index.html';
    }
    subPath = subPath.split('?')[0];

    let filePath = path.normalize(path.join(rootTestFolder, subPath));

    // make sure we jail the paths to the test folder, otherwise serve index
    if (filePath.indexOf(rootTestFolder) !== 0) {
      filePath = path.join(rootTestFolder, 'index.html');
    }
    return filePath;
  };

  args.app.get('/tests/frontend/specs/*', (req, res) => {
    const specFilePath = url2FilePath(req.url);
    const specFileName = path.basename(specFilePath);

    fs.readFile(specFilePath, (err, content) => {
      if (err) { return res.send(500); }

      content = `describe(${JSON.stringify(specFileName)}, function(){   ${content}   });`;

      if(!specFilePath.endsWith('index.html')) res.setHeader('content-type', 'application/javascript');

      res.send(content);
    });
  });

  args.app.get('/tests/frontend/*', (req, res) => {
    const filePath = url2FilePath(req.url);
    res.sendFile(filePath);
  });

  args.app.get('/tests/frontend', (req, res) => {
    res.redirect('/tests/frontend/index.html');
  });

  return cb();
};

const readdir = util.promisify(fs.readdir);

exports.getPluginTests = async function (callback) {
  const moduleDir = 'node_modules/';
  const specPath = '/static/tests/frontend/specs/';
  const staticDir = '/static/plugins/';

  const pluginSpecs = [];

  const plugins = await readdir(moduleDir);
  const promises = plugins
      .map((plugin) => [plugin, moduleDir + plugin + specPath])
      .filter(([plugin, specDir]) => fs.existsSync(specDir)) // check plugin exists
      .map(([plugin, specDir]) => readdir(specDir)
          .then((specFiles) => specFiles.map((spec) => {
            pluginSpecs.push(staticDir + plugin + specPath + spec);
          })));

  return Promise.all(promises).then(() => pluginSpecs);
};

exports.getCoreTests = function () {
  // get the core test specs
  return readdir('tests/frontend/specs');
};
