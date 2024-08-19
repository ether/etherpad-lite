'use strict';

import {ArgsExpressType} from "../../types/ArgsExpressType";
import {ErrorCaused} from "../../types/ErrorCaused";

const stats = require('../../stats')

exports.expressCreateServer = (hook_name:string, args: ArgsExpressType, cb:Function) => {
  // Handle errors
  args.app.set_error_handler((req, res, error)=>{
    // if an error occurs Connect will pass it down
    // through these "error-handling" middleware
    // allowing you to respond however you like
    res.status(500).json({error: 'Sorry, something bad happened!'});
    console.error(error.stack ? error.stack : error.toString());
    stats.meter('http500').mark();
  })


  return cb();
};
