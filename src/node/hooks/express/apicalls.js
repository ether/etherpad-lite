'use strict';

const log4js = require('log4js');
const clientLogger = log4js.getLogger('client');
const formidable = require('formidable');
const apiHandler = require('../../handler/APIHandler');

exports.expressCreateServer = (hookName, args, cb) => {
  // The Etherpad client side sends information about how a disconnect happened
  args.app.post('/ep/pad/connection-diagnostic-info', (req, res) => {
    new formidable.IncomingForm().parse(req, (err, fields, files) => {
      clientLogger.info(`DIAGNOSTIC-INFO: ${fields.diagnosticInfo}`);
      res.end('OK');
    });
  });

  // The Etherpad client side sends information about client side javscript errors
  args.app.post('/jserror', (req, res) => {
    new formidable.IncomingForm().parse(req, (err, fields, files) => {
      let data;
      try {
        data = JSON.parse(fields.errorInfo);
      } catch (e) {
        return res.end();
      }
      clientLogger.warn(`${data.msg} --`, data);
      res.end('OK');
    });
  });

  // Provide a possibility to query the latest available API version
  args.app.get('/api', (req, res) => {
    res.json({currentVersion: apiHandler.latestApiVersion});
  });

  return cb();
};
