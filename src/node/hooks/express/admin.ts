'use strict';
import {ArgsExpressType} from "../../types/ArgsExpressType";
import path from "path";
import fs from "fs";
import * as url from "node:url";
import {MapArrayType} from "../../types/MapType";

const settings = require('ep_etherpad-lite/node/utils/Settings');
import LiveDirectory from "live-directory";

const ADMIN_PATH = path.join(settings.root, 'src', 'templates', 'admin');
const PROXY_HEADER = "x-proxy-path"
/**
 * Add the admin navigation link
 * @param hookName {String} the name of the hook
 * @param args {Object} the object containing the arguments
 * @param {Function} cb  the callback function
 * @return {*}
 */
exports.expressCreateServer = (hookName: string, args: ArgsExpressType, cb: Function): any => {

  if (!fs.existsSync(ADMIN_PATH)) {
    console.error('admin template not found, skipping admin interface. You need to rebuild it in /admin with pnpm run build-copy')
    return cb();
  }

  const livedir = new LiveDirectory(ADMIN_PATH)


  args.app.get('/admin/*', (req, res) => {
    const path = req.path.replace('/admin', '');
    const file = livedir.get(path)||livedir.get('/index.html');

    // Return a 404 if no asset/file exists on the derived path
    if (file === undefined) return res.status(404).send();

    const fileParts = file.path.split(".");
    const ext = fileParts[fileParts.length - 1];
    // Retrieve the file content and serve it depending on the type of content available for this file
    const content = file.content;
    if (content instanceof Buffer) {
      // Set appropriate mime-type and serve file content Buffer as response body (This means that the file content was cached in memory)
      return res.type(ext).send(content);
    } else {
      // Set the type and stream the content as the response body (This means that the file content was NOT cached in memory)
      return res.type(ext).stream(content);
    }
  });
  args.app.get('/admin', (req: any, res: any, next: Function) => {
    if ('/' !== req.path[req.path.length - 1]) return res.redirect('./admin/');
  })
  return cb();
};
