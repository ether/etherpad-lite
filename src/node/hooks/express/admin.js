'use strict';
const eejs = require('../../eejs');

exports.expressCreateServer = (hookName, args, cb) => {
  args.app.get('/admin', (req, res) => {
    if ('/' !== req.path[req.path.length - 1]) return res.redirect('./admin/');
    res.send(eejs.require('ep_etherpad-lite/templates/admin/index.html', {req}));
  });
  return cb();
};
