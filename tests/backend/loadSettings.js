/*
 * ACHTUNG: there is a copied & modified version of this file in
 * <basedir>/tests/container/loadSettings.js
 *
 * TODO: unify those two files, and merge in a single one.
 */

var jsonminify = require(__dirname+"/../../src/node_modules/jsonminify");
const fs = require('fs');

function loadSettings(){
  var settingsStr = fs.readFileSync(__dirname+"/../../settings.json").toString();
  // try to parse the settings
  try {
    if(settingsStr) {
      settingsStr = jsonminify(settingsStr).replace(",]","]").replace(",}","}");
      var settings = JSON.parse(settingsStr);

      return settings;
    }
  }catch(e){
    console.error("whoops something is bad with settings");
  }
}

exports.loadSettings = loadSettings;
