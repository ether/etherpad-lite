import {ArgsExpressType} from "../types/ArgsExpressType";
import {MapArrayType} from "../types/MapType";
import {IncomingForm} from "formidable";
import {ErrorCaused} from "../types/ErrorCaused";
import createHTTPError from "http-errors";
const apiHandler = require('./APIHandler')

type RestAPIMapping = {
    apiVersion: string;
    functionName: string
}


const mapping = new Map<string, Record<string,RestAPIMapping>>


export const expressCreateServer = async (hookName: string, {app}: ArgsExpressType) => {
  mapping.set('GET', {})
  mapping.set('POST', {})
  mapping.set('PUT', {})
  mapping.set('DELETE', {})
  mapping.set('PATCH', {})

  // Version 1
  mapping.get('POST')!["/groups"] = {apiVersion: '1', functionName: 'createGroup'}
  mapping.get('GET')!["/pads"] = {apiVersion: '1', functionName: 'listPads'}
  mapping.get('POST')!["/groups/createIfNotExistsFor"] = {apiVersion: '1', functionName: 'createGroupIfNotExistsFor'};

  app.use('/api/2', async (req, res, next) => {
    const method = req.method
    const pathToFunction = req.path
    // parse fields from request
    const {headers, params, query} = req;

    // read form data if method was POST
    let formData: MapArrayType<any> = {};
    if (method === 'post') {
      const form = new IncomingForm();
      formData = (await form.parse(req))[0];
      for (const k of Object.keys(formData)) {
        if (formData[k] instanceof Array) {
          formData[k] = formData[k][0];
        }
      }
    }

    const fields = Object.assign({}, headers, params, query, formData);

    if (mapping.has(method) && pathToFunction in mapping.get(method)!) {
      const {apiVersion, functionName} = mapping.get(method)![pathToFunction]!
      // pass to api handler
      let data;
      try {
        data = await apiHandler.handle(apiVersion, functionName, fields, req, res);
      } catch (err) {
        const errCaused = err as ErrorCaused
        // convert all errors to http errors
        if (createHTTPError.isHttpError(err)) {
          // pass http errors thrown by handler forward
          throw err;
        } else if (errCaused.name === 'apierror') {
          // parameters were wrong and the api stopped execution, pass the error
          // convert to http error
          throw new createHTTPError.BadRequest(errCaused.message);
        } else {
          // an unknown error happened
          // log it and throw internal error
          console.error(errCaused.stack || errCaused.toString());
          throw new createHTTPError.InternalServerError('internal error');
        }
      }

      // return in common format
      const response = {code: 0, message: 'ok', data: data || null};

      console.debug(`RESPONSE, ${functionName}, ${JSON.stringify(response)}`);

      // return the response data
      res.json(response);
    } else {
      res.json({code: 1, message: 'not found'});
    }
  })
}
