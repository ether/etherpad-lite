'use strict';
import {ArgsExpressType} from "../../types/ArgsExpressType";

const eejs = require('../../eejs');
import next from 'next'

const app = next({dev: process.env.NODE_ENV !== 'production'})
const handle = app.getRequestHandler()
/**
 * Add the admin navigation link
 * @param hookName {String} the name of the hook
 * @param args {Object} the object containing the arguments
 * @param {Function} cb  the callback function
 * @return {*}
 */
exports.expressCreateServer = (hookName:string, args: ArgsExpressType, cb:Function): any => {

  args.app.get('/admin-new', (req:any, res:any) => {
    return app.render(req, res, '/admin', req.query)
  })

  args.app.all('/admin/*', (req:any, res:any) => {
    return handle(req, res)
  })

  args.app.get('/admin', (req:any, res:any) => {
    if ('/' !== req.path[req.path.length - 1]) return res.redirect('./admin/');
    res.send(eejs.require('ep_etherpad-lite/templates/admin/index.html', {req}));
  });
  return cb();
};
