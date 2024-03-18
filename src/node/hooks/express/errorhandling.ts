'use strict';

import {ArgsExpressType} from "../../types/ArgsExpressType";
import {ErrorCaused} from "../../types/ErrorCaused";

const stats = require('../../stats')

exports.expressCreateServer = (hook_name:string, args: ArgsExpressType, cb:Function) => {
  exports.app = args.app;

  // Handle errors
  args.app.setErrorHandler((error, request, reply) => {
    // if an error occurs Connect will pass it down
    // through these "error-handling" middleware
    // allowing you to respond however you like
    console.log('Error:', error);
    console.log('Request:', request.url);
    reply.status(500).send({error: 'Sorry, something bad happened!'});
    console.error(error.stack ? error.stack : error.toString());
    stats.meter('http500').mark();
  })

  return cb();
};
