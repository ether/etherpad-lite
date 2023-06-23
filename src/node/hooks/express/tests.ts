'use strict';

import path from 'path';
import {promises as fsp} from "fs";

import {plugins} from "../../../static/js/pluginfw/plugin_defs";

import sanitizePathname from "../../utils/sanitizePathname";

import {enableAdminUITests, root} from "../../utils/Settings";
import {Presession} from "../../models/Presession";
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

export const expressPreSession = async (hookName, {app}) => {
  app.get('/tests/frontend/frontendTestSpecs.json', (req, res, next) => {
    (async () => {
      const modules = [];
      await Promise.all(Object.entries(plugins).map(async ([plugin, def]) => {
        const mappedDef = def as Presession;
        let {package: {path: pluginPath}} = mappedDef;
        if (!pluginPath.endsWith(path.sep)) pluginPath += path.sep;
        const specDir = `${plugin === 'ep_etherpad-lite' ? '' : 'static/'}tests/frontend/specs`;
        for (const spec of await findSpecs(path.join(pluginPath, specDir))) {
          if (plugin === 'ep_etherpad-lite' && !enableAdminUITests &&
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

  const rootTestFolder = path.join(root, 'src/tests/frontend/');

  app.get('/tests/frontend/index.html', (req, res) => {
    res.redirect(['./', ...req.url.split('?').slice(1)].join('?'));
  });

  // The regexp /[\d\D]{0,}/ is equivalent to the regexp /.*/. The Express route path used here
  // uses the more verbose /[\d\D]{0,}/ pattern instead of /.*/ because path-to-regexp v0.1.7 (the
  // version used with Express v4.x) interprets '.' and '*' differently than regexp.
  app.get('/tests/frontend/:file([\\d\\D]{0,})', (req, res, next) => {
    (async () => {
      let file = sanitizePathname(req.params.file);
      if (['', '.', './'].includes(file)) file = 'index.html';
      res.sendFile(path.join(rootTestFolder, file));
    })().catch((err) => next(err || new Error(err)));
  });

  app.get('/tests/frontend', (req, res) => {
    res.redirect(['./frontend/', ...req.url.split('?').slice(1)].join('?'));
  });
};
