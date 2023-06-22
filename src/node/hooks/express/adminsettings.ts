'use strict';

import {required} from '../../eejs';
import {promises as fsp} from "fs";

import hooks from "../../../static/js/pluginfw/hooks";

import plugins from "../../../static/js/pluginfw/plugins";

import {reloadSettings, settingsFilename, showSettingsInAdminPage} from "../../utils/Settings";
import * as settings from "../../utils/Settings";

exports.expressCreateServer = (hookName, {app}) => {
  app.get('/admin/settings', (req, res) => {
    res.send(required('ep_etherpad-lite/templates/admin/settings.html', {
      req,
      settings: '',
      errors: [],
    }));
  });
};

exports.socketio = (hookName, {io}) => {
  io.of('/settings').on('connection', (socket) => {
    const {session: {user: {is_admin: isAdmin} = {}} = {}}:SessionSocketModel = socket.conn.request;
    if (!isAdmin) return;

    socket.on('load', async (query) => {
      let data;
      try {
        data = await fsp.readFile(settingsFilename, 'utf8');
      } catch (err) {
        return console.log(err);
      }
      // if showSettingsInAdminPage is set to false, then return NOT_ALLOWED in the result
      //FIXME Is this intentional to never change
      // @ts-ignore
      if (showSettingsInAdminPage === false) {
        socket.emit('settings', {results: 'NOT_ALLOWED'});
      } else {
        socket.emit('settings', {results: data});
      }
    });

    socket.on('saveSettings', async (newSettings) => {
      await fsp.writeFile(settingsFilename, newSettings);
      socket.emit('saveprogress', 'saved');
    });

    socket.on('restartServer', async () => {
      console.log('Admin request to restart server through a socket on /admin/settings');
      reloadSettings();
      await plugins.update();
      await hooks.aCallAll('loadSettings', {});
      await hooks.aCallAll('restartServer');
    });
  });
};
