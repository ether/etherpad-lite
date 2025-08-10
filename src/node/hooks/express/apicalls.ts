'use strict';

import express from "express";

import log4js from 'log4js';
const clientLogger = log4js.getLogger('client');
import {Formidable} from 'formidable';
import apiHandler from '../../handler/APIHandler';
import util from 'node:util';


function objectAsString(obj: any): string {
  let output = '';
  for (const property in obj) {
    if(obj.hasOwnProperty(property) && typeof obj[property] !== 'function') {
      let value = obj[property];
      if(typeof value === 'object' && !Array.isArray(value) && value !== null) {
        value = '{' + objectAsString(value) + '}';
      }
      output += property + ': ' + value +'; ';
    }
  }
  return output;
}

exports.expressPreSession = async (hookName:string, {app}:any) => {
  app.use(express.json());
  // The Etherpad client side sends information about how a disconnect happened
  app.post('/ep/pad/connection-diagnostic-info', async (req:any, res:any) => {
    if (!req.body ||!req.body.diagnosticInfo || typeof req.body.diagnosticInfo !== 'object') {
      clientLogger.warn('DIAGNOSTIC-INFO: No diagnostic info provided');
      res.status(400).end('No diagnostic info provided');
      return;
    }

    clientLogger.info(`DIAGNOSTIC-INFO: ${objectAsString(req.body.diagnosticInfo)}`);
    res.end('OK');
  });

  const parseJserrorForm = async (req:any) => {
    const form = new Formidable({
      maxFileSize: 1, // Files are not expected. Not sure if 0 means unlimited, so 1 is used.
    });
    const [fields] = await form.parse(req);
    return fields.errorInfo && fields.errorInfo[0] ? fields.errorInfo[0] : null;
  };

  // The Etherpad client side sends information about client side javascript errors
  app.post('/jserror', (req:any, res:any, next:Function) => {
    (async () => {
      const data = JSON.parse(await parseJserrorForm(req) ||'{}');
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
