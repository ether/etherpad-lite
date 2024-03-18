'use strict';

import {FastifyInstance} from "fastify";

const log4js = require('log4js');
const clientLogger = log4js.getLogger('client');
const apiHandler = require('../../handler/APIHandler');
const util = require('util');

exports.expressPreSession = async (hookName:string, {app}:{
  app: FastifyInstance
}) => {
  // The Etherpad client side sends information about how a disconnect happened
  app.post('/ep/pad/connection-diagnostic-info', async (req:any, res:any) => {
    /*const [fields, files] = await (new Formidable({})).parse(req);
    clientLogger.info(`DIAGNOSTIC-INFO: ${fields.diagnosticInfo}`);
     */
    res.send('ok');
  });

  // The Etherpad client side sends information about client side javscript errors
  app.post<{
    Body: {
      errorId: string,
      type: string,
      msg: string,
      url: string,
      source: string,
      linenumber: number,
      userAgent: string,
      stack: string,
    }
  }>('/jserror', async (req, res) => {

    clientLogger.warn(`${req.body.msg} --`, {
      [util.inspect.custom]: (depth: number, options: any) => {
        // Depth is forced to infinity to ensure that all of the provided data is logged.
        options = Object.assign({}, options, {depth: Infinity, colors: true});
        return util.inspect(req.body, options);
      },
    });
    res.send('ok');
  });

  // Provide a possibility to query the latest available API version
  app.get('/api', (req:any, res:any) => {
    res.json({currentVersion: apiHandler.latestApiVersion});
  });
};
