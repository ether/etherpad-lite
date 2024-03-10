'use strict';
import {ArgsExpressType} from "../../types/ArgsExpressType";
import path from "path";
import fs from "fs";
const settings = require('ep_etherpad-lite/node/utils/Settings');

const ADMIN_PATH = path.join(settings.root, 'src', 'templates', 'admin');

/**
 * Add the admin navigation link
 * @param hookName {String} the name of the hook
 * @param args {Object} the object containing the arguments
 * @param {Function} cb  the callback function
 * @return {*}
 */
exports.expressCreateServer = (hookName:string, args: ArgsExpressType, cb:Function): any => {
  args.app.get('/admin/*', (req:any, res:any, next:Function) => {
      if (req.path.includes('.')) {
        const relativPath = req.path.split('/admin/')[1];
        try {
            if (fs.statSync(path.join(ADMIN_PATH, relativPath)).isFile()) {
                res.sendFile(path.join(ADMIN_PATH, relativPath));
            }
        } catch (err) {
            res.status(404).send('404: Not Found');
        }
      } else {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
        res.sendFile(path.join(ADMIN_PATH, 'index.html'));
      }
    });
  args.app.get('/admin', (req:any, res:any, next:Function) => {
      if ('/' !== req.path[req.path.length - 1]) return res.redirect('./admin/');
  })
  return cb();
};
