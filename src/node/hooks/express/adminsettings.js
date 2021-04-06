'use strict';

const eejs = require('../../eejs');
const fs = require('fs');
const hooks = require('../../../static/js/pluginfw/hooks');
const plugins = require('../../../static/js/pluginfw/plugins');
const settings = require('../../utils/Settings');

exports.expressCreateServer = (hookName, args, cb) => {
  args.app.get('/admin/settings', (req, res) => {
    res.send(eejs.require('ep_etherpad-lite/templates/admin/settings.html', {
      req,
      settings: '',
      errors: [],
    }));
  });
  return cb();
};

exports.socketio = (hookName, args, cb) => {
  const io = args.io.of('/settings');
  io.on('connection', (socket) => {
    const {session: {user: {is_admin: isAdmin} = {}} = {}} = socket.conn.request;
    if (!isAdmin) return;

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
      await plugins.update();
      await hooks.aCallAll('loadSettings', {settings});
      await hooks.aCallAll('restartServer');
    });
  });
  return cb();
};
