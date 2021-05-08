'use strict';

const path = require('path');
const fsp = require('fs').promises;
const plugins = require('../../../static/js/pluginfw/plugin_defs');
const sanitizePathname = require('../../utils/sanitizePathname');
const settings = require('../../utils/Settings');

// Returns all *.js files under specDir (recursively) as relative paths to specDir, using '/'
// instead of path.sep to separate pathname components.
const findSpecs = async (specDir) => {
  let dirents;
  try {
    dirents = await fsp.readdir(specDir, {withFileTypes: true});
  } catch (err) {
    if (['ENOENT', 'ENOTDIR'].includes(err.code)) return [];
    throw err;
  }
  const specs = [];
  await Promise.all(dirents.map(async (dirent) => {
    if (dirent.isDirectory()) {
      const subdirSpecs = await findSpecs(path.join(specDir, dirent.name));
      specs.push(...subdirSpecs.map((spec) => `${dirent.name}/${spec}`));
      return;
    }
    if (!dirent.name.endsWith('.js')) return;
    specs.push(dirent.name);
  }));
  return specs;
};

exports.expressCreateServer = (hookName, args, cb) => {
  args.app.get('/tests/frontend/frontendTestSpecs.js', async (req, res) => {
    const [coreTests, pluginTests] = await Promise.all([getCoreTests(), getPluginTests()]);

    // merge the two sets of results
    let files = [].concat(coreTests, pluginTests).sort();

    // remove admin tests if the setting to enable them isn't in settings.json
    if (!settings.enableAdminUITests) {
      files = files.filter((file) => file.indexOf('admin') !== 0);
    }

    console.debug('Sent browser the following test specs:', files);
    res.setHeader('content-type', 'application/javascript');
    res.end(`window.frontendTestSpecs = ${JSON.stringify(files, null, 2)};\n`);
  });

  const rootTestFolder = path.join(settings.root, 'src/tests/frontend/');

  args.app.get('/tests/frontend/index.html', (req, res) => {
    res.redirect(['./', ...req.url.split('?').slice(1)].join('?'));
  });

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
    res.redirect(['./frontend/', ...req.url.split('?').slice(1)].join('?'));
  });

  return cb();
};

const getPluginTests = async (callback) => {
  const specPath = 'static/tests/frontend/specs';
  const specLists = await Promise.all(Object.entries(plugins.plugins).map(async ([plugin, def]) => {
    if (plugin === 'ep_etherpad-lite') return [];
    const {package: {path: pluginPath}} = def;
    const specs = await findSpecs(path.join(pluginPath, specPath));
    return specs.map((spec) => `/static/plugins/${plugin}/${specPath}/${spec}`);
  }));
  return [].concat(...specLists);
};

const getCoreTests = async () => await findSpecs('src/tests/frontend/specs');
