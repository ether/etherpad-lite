exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/admin', function(req, res) {
    res.send( 501, 'Not Implemented, yet. Meanwhile go to <a href="/admin/plugins">/admin/plugins</a>' );
  });
};