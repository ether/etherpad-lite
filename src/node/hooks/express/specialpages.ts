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

import {build, buildSync} from 'esbuild'
import {ArgsExpressType} from "../../types/ArgsExpressType";
import LiveDirectory from "live-directory";
let ioI: { sockets: { sockets: any[]; }; } | null = null

exports.socketio = (hookName: string, {io}: any) => {
  ioI = io
}


exports.expressPreSession = async (hookName:string, {app}:ArgsExpressType) => {
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

  app.get('/favicon.ico', async (req, res, next) => {

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
      res.sendFile.bind(res)(fn);
      return;
    }
    next();
  })
};



const convertTypescript = (content: string) => {
  const outputRaw = buildSync({
    stdin: {
      contents: content,
      resolveDir: path.join(settings.root, 'var','js'),
      loader: 'js'
    },
    alias:{
      "ep_etherpad-lite/static/js/browser": 'ep_etherpad-lite/static/js/vendors/browser',
      "ep_etherpad-lite/static/js/nice-select": 'ep_etherpad-lite/static/js/vendors/nice-select'
    },
    bundle: true, // Bundle the files together
    minify: process.env.NODE_ENV === "production", // Minify the output
    sourcemap: !(process.env.NODE_ENV === "production"), // Generate source maps
    sourceRoot: settings.root+"/src/static/js/",
    target: ['es2020'], // Target ECMAScript version
    metafile: true,
    write: false, // Do not write to file system,
  })
  const output = outputRaw.outputFiles[0].text

  return  {
    output,
    hash: outputRaw.outputFiles[0].hash.replaceAll('/','2').replaceAll("+",'5').replaceAll("^","7")
  }
}

const handleLiveReload = async (args: ArgsExpressType, padString: string, timeSliderString: string, indexString: any) => {


  const livedir = new LiveDirectory(path.join(settings.root, 'src', 'static', 'js'))
  let indexJS = convertTypescript(indexString)
  let padJS = convertTypescript(padString)
  let timeSliderJS = convertTypescript(timeSliderString)

  const updateLive = ()=>{
    indexJS = convertTypescript(indexString)
    padJS = convertTypescript(padString)
    timeSliderJS = convertTypescript(timeSliderString)

    ioI!.sockets.sockets.forEach(socket => socket.emit('liveupdate'))
  }


  args.app.get('/', (req, res)=>{
    res.send(eejs.require('ep_etherpad-lite/templates/index.html', {req, entrypoint: '/watch/index?hash=' + indexJS.hash, settings}));
  })
  args.app.get('/watch/index', (req, res)=>{
    res.header('Content-Type', 'application/javascript');
    res.send(indexJS.output)
  })

  args.app.get('/watch/pad', (req, res)=>{
    res.header('Content-Type', 'application/javascript');
    res.send(padJS.output)
  })

  args.app.get('/watch/timeslider', (req, res)=>{
    res.header('Content-Type', 'application/javascript');
    res.send(timeSliderJS.output)
  })

  args.app.get('/p/:pad', (req, res, next)=>{
    const isReadOnly = !webaccess.userCanModify(req.params.pad, req);

    hooks.callAll('padInitToolbar', {
      toolbar,
      isReadOnly
    });

    const content = eejs.require('ep_etherpad-lite/templates/pad.html', {
      req,
      toolbar,
      isReadOnly,
      entrypoint: '/watch/pad?hash=' + padJS.hash
    })
    res.send(content);
  })

  args.app.get('/p/:pad/timeslider', (req, res, next)=>{
    console.log("Reloading pad")
    // The below might break for pads being rewritten
    const isReadOnly = !webaccess.userCanModify(req.params.pad, req);

    hooks.callAll('padInitToolbar', {
      toolbar,
      isReadOnly
    });

    const content = eejs.require('ep_etherpad-lite/templates/timeslider.html', {
      req,
      toolbar,
      isReadOnly,
      entrypoint: '/watch/timeslider?hash=' + timeSliderJS.hash
    })
    res.send(content);
  })

  livedir.on('ready', (path: string) => {
    livedir.on('update', ()=>{
      updateLive()
    })
  })

  livedir.on('delete', ()=>{
    updateLive()
  })
}

exports.expressCreateServer = async (hookName: string, args: any, cb: Function) => {
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

  const indexString = eejs.require('ep_etherpad-lite/templates/indexBootstrap.js', {
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
  // Create the outdir if it doesn't exist
  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir);
  }

  let fileNamePad: string
  let fileNameTimeSlider: string
  let fileNameIndex: string
  if(process.env.NODE_ENV === "production"){
    const padSliderWrite = convertTypescript(padString)
    const timeSliderWrite = convertTypescript(timeSliderString)
    const indexWrite = convertTypescript(indexString)

    fileNamePad = `padbootstrap-${padSliderWrite.hash}.min.js`
    fileNameTimeSlider = `timeSliderBootstrap-${timeSliderWrite.hash}.min.js`
    fileNameIndex = `indexBootstrap-${indexWrite.hash}.min.js`
    const pathNamePad = path.join(outdir, fileNamePad)
    const pathNameTimeSlider = path.join(outdir, fileNameTimeSlider)
    const pathNameIndex = path.join(outdir, 'index.js')

    if (!fs.existsSync(pathNamePad)) {
      fs.writeFileSync(pathNamePad, padSliderWrite.output);
    }

    if (!fs.existsSync(pathNameIndex)) {
      fs.writeFileSync(pathNameIndex, indexWrite.output);
    }

    if (!fs.existsSync(pathNameTimeSlider)) {
      fs.writeFileSync(pathNameTimeSlider,timeSliderWrite.output)
    }

    args.app.get("/"+fileNamePad, (req: any, res: any) => {
      res.sendFile(pathNamePad)
    })

    args.app.get("/"+fileNameIndex, (req: any, res: any) => {
      res.sendFile(pathNameIndex)
    })

    args.app.get("/"+fileNameTimeSlider, (req: any, res: any) => {
      res.sendFile(pathNameTimeSlider)
    })

    // serve index.html under /
    args.app.get('/', (req: any, res: any) => {
      res.send(eejs.require('ep_etherpad-lite/templates/index.html', {req, settings, entrypoint: "/"+fileNameIndex}));
    });


    // serve pad.html under /p
    args.app.get('/p/:pad', (req: any, res: any, next: Function) => {
      // The below might break for pads being rewritten
      const isReadOnly = !webaccess.userCanModify(req.padId, req);

      hooks.callAll('padInitToolbar', {
        toolbar,
        isReadOnly
      });

      const content = eejs.require('ep_etherpad-lite/templates/pad.html', {
        req,
        toolbar,
        isReadOnly,
        entrypoint: "../../"+fileNamePad
      })
      res.send(content);
    });

    // serve timeslider.html under /p/$padname/timeslider
    args.app.get('/p/:pad/timeslider', (req: any, res: any, next: Function) => {
      hooks.callAll('padInitToolbar', {
        toolbar,
      });

      res.send(eejs.require('ep_etherpad-lite/templates/timeslider.html', {
        req,
        toolbar,
        entrypoint: "../../../"+fileNameTimeSlider
      }));
    });
  } else {
    await handleLiveReload(args, padString, timeSliderString, indexString)
  }

  // The client occasionally polls this endpoint to get an updated expiration for the express_sid
  // cookie. This handler must be installed after the express-session middleware.
  args.app.put('/_extendExpressSessionLifetime', (req: any, res: any) => {
    // express-session automatically calls req.session.touch() so we don't need to do it here.
    res.json({status: 'ok'});
  });
};
