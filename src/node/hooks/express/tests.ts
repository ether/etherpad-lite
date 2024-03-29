'use strict';

import {Dirent} from "node:fs";
import {PluginDef} from "../../types/PartType";

const path = require('path');
const fsp = require('fs').promises;
const plugins = require('../../../static/js/pluginfw/plugin_defs');
const sanitizePathname = require('../../utils/sanitizePathname');
const settings = require('../../utils/Settings');

// Returns all *.js files under specDir (recursively) as relative paths to specDir, using '/'
// instead of path.sep to separate pathname components.
const findSpecs = async (specDir: string) => {
  let dirents: Dirent[];
  try {
    dirents = await fsp.readdir(specDir, {withFileTypes: true});
  } catch (err:any) {
    if (['ENOENT', 'ENOTDIR'].includes(err.code)) return [];
    throw err;
  }
  const specs: string[] = [];
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

exports.expressPreSession = async (hookName:string, {app}:any) => {
  app.get('/tests/frontend/frontendTestSpecs.json', (req:any, res:any, next:Function) => {
    (async () => {
      const modules:string[] = [];
      await Promise.all(Object.entries(plugins.plugins).map(async ([plugin, def]) => {
        let {package: {path: pluginPath}} = def as PluginDef;
        if (!pluginPath.endsWith(path.sep)) pluginPath += path.sep;
        const specDir = `${plugin === 'ep_etherpad-lite' ? '' : 'static/'}tests/frontend/specs`;
        for (const spec of await findSpecs(path.join(pluginPath, specDir))) {
          if (plugin === 'ep_etherpad-lite' && !settings.enableAdminUITests &&
              spec.startsWith('admin')) continue;
          modules.push(`${plugin}/${specDir}/${spec.replace(/\.js$/, '')}`);
        }
      }));
      // Sort plugin tests before core tests.
      modules.sort((a, b) => {
        a = String(a);
        b = String(b);
        const aCore = a.startsWith('ep_etherpad-lite/');
        const bCore = b.startsWith('ep_etherpad-lite/');
        if (aCore === bCore) return a.localeCompare(b);
        return aCore ? 1 : -1;
      });
      console.debug('Sent browser the following test spec modules:', modules);
      res.json(modules);
    })().catch((err) => next(err || new Error(err)));
  });

  const rootTestFolder = path.join(settings.root, 'src/tests/frontend/');

  app.get('/tests/frontend/index.html', (req:any, res:any) => {
    res.redirect(['./', ...req.url.split('?').slice(1)].join('?'));
  });

  // The regexp /[\d\D]{0,}/ is equivalent to the regexp /.*/. The Express route path used here
  // uses the more verbose /[\d\D]{0,}/ pattern instead of /.*/ because path-to-regexp v0.1.7 (the
  // version used with Express v4.x) interprets '.' and '*' differently than regexp.
  app.get('/tests/frontend/:file([\\d\\D]{0,})', (req:any, res:any, next:Function) => {
    (async () => {
      let file = sanitizePathname(req.params.file);
      if (['', '.', './'].includes(file)) file = 'index.html';
      res.sendFile(path.join(rootTestFolder, file));
    })().catch((err) => next(err || new Error(err)));
  });

  app.get('/tests/frontend', (req:any, res:any) => {
    res.redirect(['./frontend/', ...req.url.split('?').slice(1)].join('?'));
  });
};
