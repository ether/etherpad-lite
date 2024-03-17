'use strict';

const path = require('path');
const eejs = require('../../eejs');
const fs = require('fs');
const fsp = fs.promises;
const toolbar = require('../../utils/toolbar');
const hooks = require('../../../static/js/pluginfw/hooks');
const settings = require('../../utils/Settings');
const util = require('util');
const webaccess = require('./webaccess');

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

exports.expressCreateServer = (hookName:string, args:any, cb:Function) => {
  // serve index.html under /
  args.app.get('/', (req:any, res:any) => {
    res.send(eejs.require('ep_etherpad-lite/templates/index.html', {req}));
  });

  // serve pad.html under /p
  args.app.get('/p/:pad', (req:any, res:any, next:Function) => {
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
    }));
  });

  // serve timeslider.html under /p/$padname/timeslider
  args.app.get('/p/:pad/timeslider', (req:any, res:any, next:Function) => {
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
  args.app.put('/_extendExpressSessionLifetime', (req:any, res:any) => {
    // express-session automatically calls req.session.touch() so we don't need to do it here.
    res.json({status: 'ok'});
  });

  return cb();
};
