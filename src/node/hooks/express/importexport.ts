'use strict';

import {ArgsExpressType} from "../../types/ArgsExpressType";

const hasPadAccess = require('../../padaccess');
const settings = require('../../utils/Settings');
const exportHandler = require('../../handler/ExportHandler');
const importHandler = require('../../handler/ImportHandler');
const padManager = require('../../db/PadManager');
const readOnlyManager = require('../../db/ReadOnlyManager');
const rateLimit = require('express-rate-limit');
const securityManager = require('../../db/SecurityManager');
const webaccess = require('./webaccess');
import fLimiter from '@fastify/rate-limit'

exports.expressCreateServer = async (hookName: string, args: ArgsExpressType, cb: Function) => {


  await args.app.register(fLimiter, {
    global: false,
    ...settings.importExportRateLimiting
  })
  const limiter = rateLimit({
    ...settings.importExportRateLimiting,
    handler: (request: any) => {
      if (request.rateLimit.current === request.rateLimit.limit + 1) {
        // when the rate limiter triggers, write a warning in the logs
        console.warn('Import/Export rate limiter triggered on ' +
            `"${request.originalUrl}" for IP address ${request.ip}`);
      }
    },
  });


  const handleImport = async (req: any, res: any) => {
    const types = ['pdf', 'doc', 'txt', 'html', 'odt', 'etherpad'];
    // send a 404 if we don't support this filetype
    if (types.indexOf(req.params.type) === -1) {
      return res.send(409);
    }

    // if abiword is disabled, and this is a format we only support with abiword, output a message
    if (settings.exportAvailable() === 'no' &&
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
      if (readOnlyManager.isReadOnlyId(padId)) {
        readOnlyId = padId;
        padId = await readOnlyManager.getPadId(readOnlyId);
      }

      const exists = await padManager.doesPadExists(padId);
      if (!exists) {
        console.warn(`Someone tried to export a pad that doesn't exist (${padId})`);
        return {
          code: 404,
          message: 'notfound',
        };
      }

      console.log(`Exporting pad "${req.params.pad}" in ${req.params.type} format`);
      await exportHandler.doExport(req, res, padId, readOnlyId, req.params.type);
    }
  };

  // handle export requests

  args.app.get('/p/:pad/:rev/export/:type',{
    config: {
      rateLimit: {
        ...settings.importExportRateLimiting
      }
    }
  }, handleImport);
  args.app.get('/p/:pad/export/:type',{
    config: {
      rateLimit: {
        ...settings.importExportRateLimiting
      }
    }
  }, handleImport);

  // handle import requests
  args.app.get('/p/:pad/import',{
    config: {
      rateLimit: {
        ...settings.importExportRateLimiting
      }
    }
  }, limiter);
  args.app.post('/p/:pad/import', async (req: any, res: any) => {
    // @ts-ignore
    const {session: {user} = {}} = req;
    const {accessStatus, authorID: authorId} = await securityManager.checkAccess(
        req.params.pad, req.cookies.sessionID, req.cookies.token, user);
    if (accessStatus !== 'grant' || !webaccess.userCanModify(req.params.pad, req)) {
      return res.status(403).send('Forbidden');
    }
    await importHandler.doImport(req, res, req.params.pad, authorId);
  })

  return cb();
};
