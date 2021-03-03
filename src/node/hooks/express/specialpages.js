'use strict';

const path = require('path');
const eejs = require('../../eejs');
const toolbar = require('../../utils/toolbar');
const hooks = require('../../../static/js/pluginfw/hooks');
const settings = require('../../utils/Settings');
const webaccess = require('./webaccess');

exports.expressCreateServer = (hookName, args, cb) => {
  // expose current stats
  args.app.get('/stats', (req, res) => {
    res.json(require('../../stats').toJSON());
  });

  // serve index.html under /
  args.app.get('/', (req, res) => {
    res.send(eejs.require('ep_etherpad-lite/templates/index.html', {req}));
  });

  // serve javascript.html
  args.app.get('/javascript', (req, res) => {
    res.send(eejs.require('ep_etherpad-lite/templates/javascript.html', {req}));
  });


  // serve robots.txt
  args.app.get('/robots.txt', (req, res) => {
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

  // serve pad.html under /p
  args.app.get('/p/:pad', (req, res, next) => {
    // The below might break for pads being rewritten
    const isReadOnly =
        req.url.indexOf('/p/r.') === 0 || !webaccess.userCanModify(req.params.pad, req);

    hooks.callAll('padInitToolbar', {
      toolbar,
      isReadOnly,
    });

    res.send(eejs.require('ep_etherpad-lite/templates/pad.html', {
      req,
      toolbar,
      isReadOnly,
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

  // serve favicon.ico from all path levels except as a pad name
  args.app.get(/\/favicon.ico$/, (req, res) => {
    let filePath = path.join(
        settings.root,
        'src',
        'static',
        'skins',
        settings.skinName,
        'favicon.ico'
    );
    res.setHeader('Cache-Control', `public, max-age=${settings.maxAge}`);
    res.sendFile(filePath, (err) => {
      // there is no custom favicon, send the default favicon
      if (err) {
        filePath = path.join(settings.root, 'src', 'static', 'favicon.ico');
        res.sendFile(filePath);
      }
    });
  });

  return cb();
};
