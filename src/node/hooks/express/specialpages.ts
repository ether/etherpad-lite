'use strict';

import path from 'node:path';
const eejs = require('../../eejs')
import fs from 'node:fs';
const fsp = fs.promises;
const toolbar = require('../../utils/toolbar');
const hooks = require('../../../static/js/pluginfw/hooks');
const settings = require('../../utils/Settings');
import util from 'node:util';
const webaccess = require('./webaccess');
const plugins = require('../../../static/js/pluginfw/plugin_defs');
import {hash, createHash} from 'node:crypto'


import {buildSync} from 'esbuild'
exports.expressPreSession = async (hookName:string, {app}:any) => {
  // This endpoint is intended to conform to:
  // https://www.ietf.org/archive/id/draft-inadarei-api-health-check-06.html
  app.get('/health', (req:any, res:any) => {
    res.set('Content-Type', 'application/health+json');
    res.json({
      status: 'pass',
      releaseId: settings.getEpVersion(),
    });
  });

  app.get('/stats', (req:any, res:any) => {
    res.json(require('../../stats').toJSON());
  });

  app.get('/javascript', (req:any, res:any) => {
    res.send(eejs.require('ep_etherpad-lite/templates/javascript.html', {req}));
  });

  app.get('/robots.txt', (req:any, res:any) => {
    let filePath =
        path.join(settings.root, 'src', 'static', 'skins', settings.skinName, 'robots.txt');
    res.sendFile(filePath, (err:any) => {
      // there is no custom robots.txt, send the default robots.txt which dissallows all
      if (err) {
        filePath = path.join(settings.root, 'src', 'static', 'robots.txt');
        res.sendFile(filePath);
      }
    });
  });

  app.get('/favicon.ico', (req:any, res:any, next:Function) => {
    (async () => {
      /*
        If this is a url we simply redirect to that one.
       */
      if (settings.favicon && settings.favicon.startsWith('http')) {
        res.redirect(settings.favicon);
        res.send();
        return;
      }


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

exports.expressCreateServer = async (hookName: string, args: any, cb: Function) => {
  // serve index.html under /
  args.app.get('/', (req: any, res: any) => {
    res.send(eejs.require('ep_etherpad-lite/templates/index.html', {req}));
  });


  const padString =   eejs.require('ep_etherpad-lite/templates/padBootstrap.js', {
      pluginModules: (() => {
        const pluginModules = new Set();
        for (const part of plugins.parts) {
          for (const [, hookFnName] of Object.entries(part.client_hooks || {})) {
            // @ts-ignore
            pluginModules.add(hookFnName.split(':')[0]);
          }
        }
        return [...pluginModules];
      })(),
      settings,
    })


    const timeSliderString = eejs.require('ep_etherpad-lite/templates/timeSliderBootstrap.js', {
      pluginModules: (() => {
        const pluginModules = new Set();
        for (const part of plugins.parts) {
          for (const [, hookFnName] of Object.entries(part.client_hooks || {})) {
            // @ts-ignore
            pluginModules.add(hookFnName.split(':')[0]);
          }
        }
        return [...pluginModules];
      })(),
      settings,
    })



  const outdir = path.join(settings.root, 'var','js')

  const padWriteResult = buildSync({
    stdin: {
      contents: padString,
      resolveDir: path.join(settings.root, 'var','js'),
      loader: 'js'
    }, // Entry file(s)
    bundle: true, // Bundle the files together
    minify: process.env.NODE_ENV === "production", // Minify the output
    sourcemap: !(process.env.NODE_ENV === "production"), // Generate source maps
    sourceRoot: settings.root+"/src/static/js/",
    target: ['es2020'], // Target ECMAScript version
    metafile: true,
    write: false, // Do not write to file system,
  })

  const outputPadJS  = padWriteResult.outputFiles[0].text

   const timeSliderWrite = buildSync({
     stdin: {
       contents: timeSliderString,
       resolveDir: path.join(settings.root, 'var','js'),
       loader: 'js'
     },
    bundle: true, // Bundle the files together
    minify: process.env.NODE_ENV === "production", // Minify the output
    sourcemap: !(process.env.NODE_ENV === "production"), // Generate source maps
    sourceRoot: settings.root+"/src/static/js/",
    target: ['es2020'], // Target ECMAScript version
    metafile: true,
    write: false, // Do not write to file system,
  })

  const outputTimeslider = timeSliderWrite.outputFiles[0].text

  const hash = padWriteResult.outputFiles[0].hash
  const hashTimeSlider = timeSliderWrite.outputFiles[0].hash

  const fileNamePad = `padbootstrap-${hash}.min.js`
  const fileNameTimeSlider = `timeSliderBootstrap-${hashTimeSlider}.min.js`
  const pathNamePad = path.join(outdir, fileNamePad)
  const pathNameTimeSlider = path.join(outdir, fileNameTimeSlider)

  if (!fs.existsSync(pathNamePad)) {
    fs.writeFileSync(pathNamePad, outputPadJS);
  }

  if (!fs.existsSync(pathNameTimeSlider)) {
    fs.writeFileSync(pathNameTimeSlider,outputTimeslider)
  }

  args.app.get("/"+fileNamePad, (req: any, res: any) => {
    res.sendFile(pathNamePad)
  })

  args.app.get("/"+fileNameTimeSlider, (req: any, res: any) => {
    res.sendFile(pathNameTimeSlider)
  })


  // serve pad.html under /p
  args.app.get('/p/:pad', (req: any, res: any, next: Function) => {
    // The below might break for pads being rewritten
    const isReadOnly = !webaccess.userCanModify(req.params.pad, req);

    hooks.callAll('padInitToolbar', {
      toolbar,
      isReadOnly
    });

    // can be removed when require-kernel is dropped
    res.header('Feature-Policy', 'sync-xhr \'self\'');
    res.send(eejs.require('ep_etherpad-lite/templates/pad.html', {
      req,
      toolbar,
      isReadOnly,
      entrypoint: "/"+fileNamePad
    }));
  });

  // serve timeslider.html under /p/$padname/timeslider
  args.app.get('/p/:pad/timeslider', (req: any, res: any, next: Function) => {
    hooks.callAll('padInitToolbar', {
      toolbar,
    });

    res.send(eejs.require('ep_etherpad-lite/templates/timeslider.html', {
      req,
      toolbar,
      entrypoint: "/"+fileNameTimeSlider
    }));
  });

  // The client occasionally polls this endpoint to get an updated expiration for the express_sid
  // cookie. This handler must be installed after the express-session middleware.
  args.app.put('/_extendExpressSessionLifetime', (req: any, res: any) => {
    // express-session automatically calls req.session.touch() so we don't need to do it here.
    res.json({status: 'ok'});
  });
};
