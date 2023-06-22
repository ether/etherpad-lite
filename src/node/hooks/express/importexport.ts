'use strict';

import hasPadAccess from '../../padaccess';
import {exportAvailable, importExportRateLimiting} from '../../utils/Settings';
import {doExport} from '../../handler/ExportHandler';
import {doImport2} from '../../handler/ImportHandler';
import {doesPadExist} from '../../db/PadManager';
import {getPadId, isReadOnlyId} from '../../db/ReadOnlyManager';
import rateLimit from 'express-rate-limit';
import {checkAccess} from '../../db/SecurityManager';
import webaccess from './webaccess';

exports.expressCreateServer = (hookName, args, cb) => {
  importExportRateLimiting.onLimitReached = (req, res, options) => {
    // when the rate limiter triggers, write a warning in the logs
    console.warn('Import/Export rate limiter triggered on ' +
                 `"${req.originalUrl}" for IP address ${req.ip}`);
  };
  // The rate limiter is created in this hook so that restarting the server resets the limiter.
  const limiter = rateLimit(importExportRateLimiting);

  // handle export requests
  args.app.use('/p/:pad/:rev?/export/:type', limiter);
  args.app.get('/p/:pad/:rev?/export/:type', (req, res, next) => {
    (async () => {
      const types = ['pdf', 'doc', 'txt', 'html', 'odt', 'etherpad'];
      // send a 404 if we don't support this filetype
      if (types.indexOf(req.params.type) === -1) {
        return next();
      }

      // if abiword is disabled, and this is a format we only support with abiword, output a message
      if (exportAvailable() === 'no' &&
          ['odt', 'pdf', 'doc'].indexOf(req.params.type) !== -1) {
        console.error(`Impossible to export pad "${req.params.pad}" in ${req.params.type} format.` +
                      ' There is no converter configured');

        // ACHTUNG: do not include req.params.type in res.send() because there is
        // no HTML escaping and it would lead to an XSS
        res.send('This export is not enabled at this Etherpad instance. Set the path to Abiword' +
                 ' or soffice (LibreOffice) in settings.json to enable this feature');
        return;
      }

      res.header('Access-Control-Allow-Origin', '*');

      if (await hasPadAccess(req, res)) {
        let padId = req.params.pad;

        let readOnlyId = null;
        if (isReadOnlyId(padId)) {
          readOnlyId = padId;
          padId = await getPadId(readOnlyId);
        }

        const exists = await doesPadExist(padId);
        if (!exists) {
          console.warn(`Someone tried to export a pad that doesn't exist (${padId})`);
          return next();
        }

        console.log(`Exporting pad "${req.params.pad}" in ${req.params.type} format`);
        await doExport(req, res, padId, readOnlyId, req.params.type);
      }
    })().catch((err) => next(err || new Error(err)));
  });

  // handle import requests
  args.app.use('/p/:pad/import', limiter);
  args.app.post('/p/:pad/import', (req, res, next) => {
    (async () => {
      const {session: {user} = {}}:SessionSocketModel = req;
      const {accessStatus, authorID: authorId} = await checkAccess(
          req.params.pad, req.cookies.sessionID, req.cookies.token, user);
      if (accessStatus !== 'grant' || !webaccess.userCanModify(req.params.pad, req)) {
        return res.status(403).send('Forbidden');
      }
      await doImport2(req, res, req.params.pad, authorId);
    })().catch((err) => next(err || new Error(err)));
  });

  return cb();
};
