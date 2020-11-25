const eejs = require('ep_etherpad-lite/node/eejs');
const settings = require('ep_etherpad-lite/node/utils/Settings');
const hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');
const fs = require('fs');

exports.expressCreateServer = function (hook_name, args, cb) {
  args.app.get('/admin/settings', (req, res) => {
    res.send(eejs.require('ep_etherpad-lite/templates/admin/settings.html', {
      req,
      settings: '',
      search_results: {},
      errors: [],
    }));
  });
  return cb();
};

exports.socketio = function (hook_name, args, cb) {
  const io = args.io.of('/settings');
  io.on('connection', (socket) => {
    if (!socket.conn.request.session || !socket.conn.request.session.user || !socket.conn.request.session.user.is_admin) return;

    socket.on('load', (query) => {
      fs.readFile('settings.json', 'utf8', (err, data) => {
        if (err) {
          return console.log(err);
        }

        // if showSettingsInAdminPage is set to false, then return NOT_ALLOWED in the result
        if (settings.showSettingsInAdminPage === false) {
          socket.emit('settings', {results: 'NOT_ALLOWED'});
        } else {
          socket.emit('settings', {results: data});
        }
      });
    });

    socket.on('saveSettings', (settings) => {
      fs.writeFile('settings.json', settings, (err) => {
        if (err) throw err;
        socket.emit('saveprogress', 'saved');
      });
    });

    socket.on('restartServer', async () => {
      console.log('Admin request to restart server through a socket on /admin/settings');
      settings.reloadSettings();
      await hooks.aCallAll('restartServer');
    });
  });
  return cb();
};
