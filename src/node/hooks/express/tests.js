'use strict';

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const settings = require('../../utils/Settings');

exports.expressCreateServer = (hookName, args, cb) => {
  args.app.get('/tests/frontend/specs_list.js', async (req, res) => {
    const [coreTests, pluginTests] = await Promise.all([
      exports.getCoreTests(),
      exports.getPluginTests(),
    ]);

    // merge the two sets of results
    let files = [].concat(coreTests, pluginTests).sort();

    // Keep only *.js files
    files = files.filter((f) => f.endsWith('.js'));

    // remove admin tests if the setting to enable them isn't in settings.json
    if (!settings.enableAdminUITests) {
      files = files.filter((file) => file.indexOf('admin') !== 0);
    }

    console.debug('Sent browser the following test specs:', files);
    res.setHeader('content-type', 'application/javascript');
    res.end(`var specs_list = ${JSON.stringify(files)};\n`);
  });

  const rootTestFolder = path.join(settings.root, 'src/tests/frontend/');

  const sanitizePath = (subPath) => {
    if (subPath === '') {
      subPath = 'index.html';
    }
    let filePath = path.join(rootTestFolder, subPath);
    // make sure we jail the paths to the test folder, otherwise serve index
    if (filePath.indexOf(rootTestFolder) !== 0) {
      filePath = path.join(rootTestFolder, 'index.html');
    }
    return filePath;
  };

  // The regexp /[\d\D]{0,}/ is equivalent to the regexp /.*/. The Express route path used here
  // uses the more verbose /[\d\D]{0,}/ pattern instead of /.*/ because path-to-regexp v0.1.7 (the
  // version used with Express v4.x) interprets '.' and '*' differently than regexp.
  args.app.get('/tests/frontend/specs/:file([\\d\\D]{0,})', (req, res, next) => {
    (async () => {
      const file = sanitizePath(`specs/${req.params.file}`);
      if (file.endsWith('.js')) {
        const content = await fsp.readFile(file);
        res.setHeader('content-type', 'application/javascript');
        res.send(`describe(${JSON.stringify(path.basename(file))}, function () {\n${content}\n});`);
      } else {
        res.sendFile(file);
      }
    })().catch((err) => next(err || new Error(err)));
  });

  args.app.get('/tests/frontend/:file([\\d\\D]{0,})', (req, res) => {
    const filePath = sanitizePath(req.params.file);
    res.sendFile(filePath);
  });

  args.app.get('/tests/frontend', (req, res) => {
    res.redirect('/tests/frontend/index.html');
  });

  return cb();
};

exports.getPluginTests = async (callback) => {
  const moduleDir = 'node_modules/';
  const specPath = '/static/tests/frontend/specs/';
  const staticDir = '/static/plugins/';

  const pluginSpecs = [];

  const plugins = await fsp.readdir(moduleDir);
  await Promise.all(plugins
      .map((plugin) => [plugin, moduleDir + plugin + specPath])
      .filter(([plugin, specDir]) => fs.existsSync(specDir)) // check plugin exists
      .map(async ([plugin, specDir]) => {
        const specFiles = await fsp.readdir(specDir);
        return specFiles.map((spec) => {
          pluginSpecs.push(staticDir + plugin + specPath + spec);
        });
      }));
  return pluginSpecs;
};

exports.getCoreTests = async () => await fsp.readdir('src/tests/frontend/specs');
