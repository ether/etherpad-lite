/*
 * ACHTUNG: this file was copied & modified from the analogous
 * <basedir>/tests/backend/loadSettings.js
 *
 * TODO: unify those two files, and merge in a single one.
 */

var jsonminify = require(__dirname+"/../../src/node_modules/jsonminify");
const fs = require('fs');

function loadSettings(){
  var settingsStr = fs.readFileSync(__dirname+"/../../settings.json.docker").toString();
  // try to parse the settings
  try {
    if(settingsStr) {
      settingsStr = jsonminify(settingsStr).replace(",]","]").replace(",}","}");
      var settings = JSON.parse(settingsStr);

      // custom settings for running in a container
      settings.ip = 'localhost';
      settings.port = '9001';

      return settings;
    }
  }catch(e){
    console.error("whoops something is bad with settings");
  }
}

exports.loadSettings = loadSettings;
