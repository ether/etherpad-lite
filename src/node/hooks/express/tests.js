'use strict';

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const sanitizePathname = require('../../utils/sanitizePathname');
const settings = require('../../utils/Settings');

exports.expressCreateServer = (hookName, args, cb) => {
  args.app.get('/tests/frontend/frontendTestSpecs.js', async (req, res) => {
    const [coreTests, pluginTests] = await Promise.all([getCoreTests(), getPluginTests()]);

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
    res.end(`window.frontendTestSpecs = ${JSON.stringify(files, null, 2)};\n`);
  });

  const rootTestFolder = path.join(settings.root, 'src/tests/frontend/');

  // The regexp /[\d\D]{0,}/ is equivalent to the regexp /.*/. The Express route path used here
  // uses the more verbose /[\d\D]{0,}/ pattern instead of /.*/ because path-to-regexp v0.1.7 (the
  // version used with Express v4.x) interprets '.' and '*' differently than regexp.
  args.app.get('/tests/frontend/:file([\\d\\D]{0,})', (req, res, next) => {
    (async () => {
      let relFile = sanitizePathname(req.params.file);
      if (['', '.', './'].includes(relFile)) relFile = 'index.html';
      const file = path.join(rootTestFolder, relFile);
      if (relFile.startsWith('specs/') && file.endsWith('.js')) {
        const content = await fsp.readFile(file);
        res.setHeader('content-type', 'application/javascript');
        res.send(`describe(${JSON.stringify(path.basename(file))}, function () {\n${content}\n});`);
      } else {
        res.sendFile(file);
      }
    })().catch((err) => next(err || new Error(err)));
  });

  args.app.get('/tests/frontend', (req, res) => {
    res.redirect('/tests/frontend/index.html');
  });

  return cb();
};

const getPluginTests = async (callback) => {
  const moduleDir = 'node_modules/';
  const specPath = '/static/tests/frontend/specs/';
  const staticDir = '/static/plugins/';
  const plugins = await fsp.readdir(moduleDir);
  const specLists = await Promise.all(plugins.map(async (plugin) => {
    const specDir = moduleDir + plugin + specPath;
    if (!fs.existsSync(specDir)) return [];
    const specFiles = await fsp.readdir(specDir);
    return specFiles.map((spec) => staticDir + plugin + specPath + spec);
  }));
  return [].concat(...specLists);
};

const getCoreTests = async () => await fsp.readdir('src/tests/frontend/specs');
