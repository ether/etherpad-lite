'use strict';

const log4js = require('log4js');
const clientLogger = log4js.getLogger('client');
const {Formidable} = require('formidable');
const apiHandler = require('../../handler/APIHandler');
const util = require('util');

exports.expressPreSession = async (hookName:string, {app}:any) => {
  // The Etherpad client side sends information about how a disconnect happened
  app.post('/ep/pad/connection-diagnostic-info', async (req:any, res:any) => {
    const [fields, files] = await (new Formidable({})).parse(req);
    clientLogger.info(`DIAGNOSTIC-INFO: ${fields.diagnosticInfo}`);
    res.end('OK');
  });

  const parseJserrorForm = async (req:any) => {
    const form = new Formidable({
      maxFileSize: 1, // Files are not expected. Not sure if 0 means unlimited, so 1 is used.
    });
    const [fields, files] = await form.parse(req);
    return fields.errorInfo;
  };

  // The Etherpad client side sends information about client side javscript errors
  app.post('/jserror', (req:any, res:any, next:Function) => {
    (async () => {
      const data = JSON.parse(await parseJserrorForm(req));
      clientLogger.warn(`${data.msg} --`, {
        [util.inspect.custom]: (depth: number, options:any) => {
          // Depth is forced to infinity to ensure that all of the provided data is logged.
          options = Object.assign({}, options, {depth: Infinity, colors: true});
          return util.inspect(data, options);
        },
      });
      res.end('OK');
    })().catch((err) => next(err || new Error(err)));
  });

  // Provide a possibility to query the latest available API version
  app.get('/api', (req:any, res:any) => {
    res.json({currentVersion: apiHandler.latestApiVersion});
  });
};
