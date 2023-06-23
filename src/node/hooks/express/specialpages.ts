'use strict';

import path from 'path';
import {required} from '../../eejs';
import fs from 'fs';
const fsp = fs.promises;
import {} from '../../utils/toolbar';
import {callAll} from '../../../static/js/pluginfw/hooks';
import {favicon, getEpVersion, maxAge, root, skinName} from '../../utils/Settings';
import util from 'util';
import {userCanModify} from './webaccess';

export const expressPreSession = async (hookName, {app}) => {
  // This endpoint is intended to conform to:
  // https://www.ietf.org/archive/id/draft-inadarei-api-health-check-06.html
  app.get('/health', (req, res) => {
    res.set('Content-Type', 'application/health+json');
    res.json({
      status: 'pass',
      releaseId: getEpVersion(),
    });
  });

  app.get('/stats', (req, res) => {
    res.json(required('../../stats').toJSON());
  });

  app.get('/javascript', (req, res) => {
    res.send(required('ep_etherpad-lite/templates/javascript.html', {req}));
  });

  app.get('/robots.txt', (req, res) => {
    let filePath =
        path.join(root, 'src', 'static', 'skins', skinName, 'robots.txt');
    res.sendFile(filePath, (err) => {
      // there is no custom robots.txt, send the default robots.txt which dissallows all
      if (err) {
        filePath = path.join(root, 'src', 'static', 'robots.txt');
        res.sendFile(filePath);
      }
    });
  });

  app.get('/favicon.ico', (req, res, next) => {
    (async () => {
      const fns = [
        ...(favicon ? [path.resolve(root, favicon)] : []),
        path.join(root, 'src', 'static', 'skins', skinName, 'favicon.ico'),
        path.join(root, 'src', 'static', 'favicon.ico'),
      ];
      for (const fn of fns) {
        try {
          await fsp.access(fn, fs.constants.R_OK);
        } catch (err) {
          continue;
        }
        res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
        await util.promisify(res.sendFile.bind(res))(fn);
        return;
      }
      next();
    })().catch((err) => next(err || new Error(err)));
  });
};

export const expressCreateServer = (hookName, args, cb) => {
  // serve index.html under /
  args.app.get('/', (req, res) => {
    res.send(required('ep_etherpad-lite/templates/index.html', {req}));
  });

  // serve pad.html under /p
  args.app.get('/p/:pad', (req, res, next) => {
    // The below might break for pads being rewritten
    const isReadOnly = !userCanModify(req.params.pad, req);

    callAll('padInitToolbar', {
      toolbar,
      isReadOnly,
    });

    // can be removed when require-kernel is dropped
    res.header('Feature-Policy', 'sync-xhr \'self\'');
    res.send(required('ep_etherpad-lite/templates/pad.html', {
      req,
      toolbar,
      isReadOnly,
    }));
  });

  // serve timeslider.html under /p/$padname/timeslider
  args.app.get('/p/:pad/timeslider', (req, res, next) => {
    callAll('padInitToolbar', {
      toolbar,
    });

    res.send(required('ep_etherpad-lite/templates/timeslider.html', {
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

  return cb();
};
