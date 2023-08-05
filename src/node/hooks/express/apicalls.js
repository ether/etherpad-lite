'use strict';

const log4js = require('log4js');
const clientLogger = log4js.getLogger('client');
const {Formidable} = require('formidable');
const apiHandler = require('../../handler/APIHandler');
const util = require('util');

exports.expressPreSession = async (hookName, {app}) => {
  // The Etherpad client side sends information about how a disconnect happened
  app.post('/ep/pad/connection-diagnostic-info', async (req, res) => {
    const [fields, files] = await (new Formidable({})).parse(req);
    clientLogger.info(`DIAGNOSTIC-INFO: ${fields.diagnosticInfo}`);
    res.end('OK');
  });

  const parseJserrorForm = async (req) => {
    const form = new Formidable({
      maxFileSize: 1, // Files are not expected. Not sure if 0 means unlimited, so 1 is used.
    });
    const [fields, files] = await form.parse(req);
    return fields.errorInfo;
  };

  // The Etherpad client side sends information about client side javscript errors
  app.post('/jserror', (req, res, next) => {
    (async () => {
      const data = JSON.parse(await parseJserrorForm(req));
      clientLogger.warn(`${data.msg} --`, {
        [util.inspect.custom]: (depth, options) => {
          // Depth is forced to infinity to ensure that all of the provided data is logged.
          options = Object.assign({}, options, {depth: Infinity, colors: true});
          return util.inspect(data, options);
        },
      });
      res.end('OK');
    })().catch((err) => next(err || new Error(err)));
  });

  // Provide a possibility to query the latest available API version
  app.get('/api', (req, res) => {
    res.json({currentVersion: apiHandler.latestApiVersion});
  });
};
