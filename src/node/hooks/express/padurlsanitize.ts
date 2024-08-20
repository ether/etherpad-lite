'use strict';

import {ArgsExpressType} from "../../types/ArgsExpressType";

const padManager = require('../../db/PadManager');

exports.expressCreateServer = (hookName:string, args:ArgsExpressType, cb:Function) => {
  // redirects browser to the pad's sanitized url if needed. otherwise, renders the html
  args.app.use(async (req, res, next) => {
    const possiblePad = decodeURIComponent(req.params.pad)

    try {
      if (!possiblePad) {
        return next()
      }
      // ensure the padname is valid and the url doesn't end with a /
      if (!padManager.isValidPadId(possiblePad) || /\/$/.test(req.url)) {
        res.status(404).send('Such a padname is forbidden');
        return;
      }

      const sanitizedPadId = await padManager.sanitizePadId(possiblePad);

      if (sanitizedPadId === possiblePad) {
        // the pad id was fine, so just render it
        return next();
      } else {
        // the pad id was sanitized, so we redirect to the sanitized version
        const realURL =
          encodeURIComponent(sanitizedPadId) + new URL(req.url, 'http://invalid.invalid').search;
        res.header('Location', realURL);
        res.status(302).send(`You should be redirected to <a href="${realURL}">${realURL}</a>`);
        return
      }
    }
    catch (e) {
      return e
    }
  })
  return cb();
};
