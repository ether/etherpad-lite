'use strict';

const path = require('path');
const eejs = require('../../eejs');
const fs = require('fs');
const fsp = fs.promises;
const toolbar = require('../../utils/toolbar');
const hooks = require('../../../static/js/pluginfw/hooks');
const plugins = require('../../../static/js/pluginfw/plugin_defs');
const settings = require('../../utils/Settings');
const util = require('util');
const webaccess = require('./webaccess');
const webpack = require('webpack');

exports.expressPreSession = async (hookName, {app}) => {
  // This endpoint is intended to conform to:
  // https://www.ietf.org/archive/id/draft-inadarei-api-health-check-06.html
  app.get('/health', (req, res) => {
    res.set('Content-Type', 'application/health+json');
    res.json({
      status: 'pass',
      releaseId: settings.getEpVersion(),
    });
  });

  app.get('/stats', (req, res) => {
    res.json(require('../../stats').toJSON());
  });

  app.get('/javascript', (req, res) => {
    res.send(eejs.require('ep_etherpad-lite/templates/javascript.html', {req}));
  });

  app.get('/robots.txt', (req, res) => {
    let filePath = path.join(
        settings.root,
        'src',
        'static',
        'skins',
        settings.skinName,
        'robots.txt'
    );
    res.sendFile(filePath, (err) => {
      // there is no custom robots.txt, send the default robots.txt which dissallows all
      if (err) {
        filePath = path.join(settings.root, 'src', 'static', 'robots.txt');
        res.sendFile(filePath);
      }
    });
  });

  app.get('/favicon.ico', (req, res, next) => {
    (async () => {
      const fns = [
        ...(settings.favicon ? [path.resolve(settings.root, settings.favicon)] : []),
        path.join(settings.root, 'src', 'static', 'skins', settings.skinName, 'favicon.ico'),
        path.join(settings.root, 'src', 'static', 'favicon.ico'),
      ];
      for (const fn of fns) {
        try {
          await fsp.access(fn, fs.constants.R_OK);
        } catch (err) {
          continue;
        }
        res.setHeader('Cache-Control', `public, max-age=${settings.maxAge}`);
        await util.promisify(res.sendFile.bind(res))(fn);
        return;
      }
      next();
    })().catch((err) => next(err || new Error(err)));
  });
};

exports.expressCreateServer = async (hookName, args) => {
  // serve index.html under /
  args.app.get('/', (req, res) => {
    res.send(eejs.require('ep_etherpad-lite/templates/index.html', {req}));
  });

  await fsp.mkdir(path.join(settings.root, 'var/js'), {recursive: true});
  await fsp.writeFile(
      path.join(settings.root, 'var/js/padbootstrap.js'),
      eejs.require('ep_etherpad-lite/templates/padbootstrap.js', {
        pluginModules: (() => {
          const pluginModules = new Set();
          for (const part of plugins.parts) {
            for (const [, hookFnName] of Object.entries(part.client_hooks || {})) {
              pluginModules.add(hookFnName.split(':')[0]);
            }
          }
          return [...pluginModules];
        })(),
        settings,
      }));

  console.log('Packaging client-side JavaScript...');
  const compiler = webpack({
    context: settings.root,
    devtool: 'source-map',
    entry: './var/js/padbootstrap.js',
    mode: process.env.NODE_ENV || 'development',
    module: {
      parser: {
        javascript: {
          commonjsMagicComments: true,
        },
      },
    },
    output: {
      path: path.join(settings.root, 'var/js'),
      filename: '[name]-[contenthash].js',
    },
    resolve: {
      alias: {
        'ep_etherpad-lite': path.join(settings.root, 'src'),
      },
    },
  });
  const stats = await util.promisify(compiler.run.bind(compiler))();
  console.log(`webpack stats:\n${stats}`);
  const mainName = stats.toJson('minimal').assetsByChunkName.main;

  args.app.get(`/${mainName}`, (req, res, next) => {
    res.sendFile(path.join(settings.root, `var/js/${mainName}`));
  });
  args.app.get(`/${mainName}.map`, (req, res, next) => {
    res.sendFile(path.join(settings.root, `var/js/${mainName}.map`));
  });

  // serve pad.html under /p
  args.app.get('/p/:pad', (req, res, next) => {
    // The below might break for pads being rewritten
    const isReadOnly = !webaccess.userCanModify(req.params.pad, req);

    hooks.callAll('padInitToolbar', {
      toolbar,
      isReadOnly,
    });

    // can be removed when require-kernel is dropped
    res.header('Feature-Policy', 'sync-xhr \'self\'');
    res.send(eejs.require('ep_etherpad-lite/templates/pad.html', {
      req,
      toolbar,
      isReadOnly,
      entrypoint: `../${mainName}`,
    }));
  });

  // serve timeslider.html under /p/$padname/timeslider
  args.app.get('/p/:pad/timeslider', (req, res, next) => {
    hooks.callAll('padInitToolbar', {
      toolbar,
    });

    res.send(eejs.require('ep_etherpad-lite/templates/timeslider.html', {
      req,
      toolbar,
    }));
  });

  // The client occasionally polls this endpoint to get an updated expiration for the express_sid
  // cookie. This handler must be installed after the express-session middleware.
  args.app.put('/_extendExpressSessionLifetime', (req, res) => {
    // express-session automatically calls req.session.touch() so we don't need to do it here.
    res.json({status: 'ok'});
  });
};
