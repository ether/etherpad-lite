'use strict';

const eejs = require('../../eejs');
const fsp = require('fs').promises;
const hooks = require('../../../static/js/pluginfw/hooks');
const plugins = require('../../../static/js/pluginfw/plugins');
const settings = require('../../utils/Settings');

exports.expressCreateServer = (hookName, {app}) => {
  app.get('/admin/settings', (req, res) => {
    res.send(eejs.require('ep_etherpad-lite/templates/admin/settings.html', {
      req,
      settings: '',
      errors: [],
    }));
  });
};

exports.socketio = (hookName, {io}) => {
  io.of('/settings').on('connection', (socket) => {
    const {session: {user: {is_admin: isAdmin} = {}} = {}} = socket.conn.request;
    if (!isAdmin) return;

    socket.on('load', async (query) => {
      let data;
      try {
        data = await fsp.readFile(settings.settingsFilename, 'utf8');
      } catch (err) {
        return console.log(err);
      }
      // if showSettingsInAdminPage is set to false, then return NOT_ALLOWED in the result
      if (settings.showSettingsInAdminPage === false) {
        socket.emit('settings', {results: 'NOT_ALLOWED'});
      } else {
        socket.emit('settings', {results: data});
      }
    });

    socket.on('saveSettings', async (newSettings) => {
      await fsp.writeFile(settings.settingsFilename, newSettings);
      socket.emit('saveprogress', 'saved');
    });

    socket.on('restartServer', async () => {
      console.log('Admin request to restart server through a socket on /admin/settings');
      settings.reloadSettings();
      await plugins.update();
      await hooks.aCallAll('loadSettings', {settings});
      await hooks.aCallAll('restartServer');
    });
  });
};
