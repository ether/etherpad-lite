'use strict';
import {required} from '../../eejs';

export const expressCreateServer = (hookName:string, args, cb) => {
  args.app.get('/admin', (req, res) => {
    if ('/' !== req.path[req.path.length - 1]) return res.redirect('./admin/');
    res.send(required('ep_etherpad-lite/templates/admin/index.html', {req}));
  });
  return cb();
};
