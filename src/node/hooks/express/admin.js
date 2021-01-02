const eejs = require('../../eejs');

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/admin', (req, res) => {
    if ('/' != req.path[req.path.length - 1]) return res.redirect('./admin/');
    res.send(eejs.require('../../../templates/admin/index.html', {req}));
  });
  return cb();
};
