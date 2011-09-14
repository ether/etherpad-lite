/**
 * The Settings Modul reads the settings out of settings.json and provides 
 * this information to the other modules
 */

/*
 * 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var fs = require("fs");

/**
 * The IP ep-lite should listen to
 */
exports.ip = "0.0.0.0";
  
/**
 * The Port ep-lite should listen to
 */
exports.port = 9001;
/*
 * The Type of the database
 */
exports.dbType = "dirty";
/**
 * This setting is passed with dbType to ueberDB to set up the database
 */
exports.dbSettings = { "filename" : "../var/dirty.db" };
/**
 * The default Text of a new pad
 */
exports.defaultPadText = "Welcome to Etherpad Lite!\n\nThis pad text is synchronized as you type, so that everyone viewing this page sees the same text. This allows you to collaborate seamlessly on documents!\n\nEtherpad Lite on Github: http:\/\/j.mp/ep-lite\n";
/**
 * A flag that shows if minification is enabled or not
 */
exports.minify = true;

/**
 * The path of the abiword executable
 */
exports.abiword = null;

/**
 * The log level of log4js
 */
exports.loglevel = "INFO";

/**
 * xhr-polling duration
 */
exports.pollingDuration = 20;

//read the settings sync
var settingsStr = fs.readFileSync("../settings.json").toString();

//remove all comments
settingsStr = settingsStr.replace(/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+/gm,"").replace(/#.*/g,"").replace(/\/\/.*/g,"");

//try to parse the settings
var settings;
try
{
  settings = JSON.parse(settingsStr);
}
catch(e)
{
  console.error("There is a syntax error in your settings.json file");
  console.error(e.message);
  process.exit(1);
}

//loop trough the settings
for(var i in settings)
{
  //test if the setting start with a low character
  if(i.charAt(0).search("[a-z]") !== 0)
  {
    console.warn("Settings should start with a low character: '" + i + "'");
  }

  //we know this setting, so we overwrite it
  if(exports[i] !== undefined)
  {
    exports[i] = settings[i];
  }
  //this setting is unkown, output a warning and throw it away
  else
  {
    console.warn("Unkown Setting: '" + i + "'");
    console.warn("This setting doesn't exist or it was removed");
  }
}

// If deployed in CloudFoundry
if(process.env.VCAP_APP_PORT) {
  exports.port = process.env.VCAP_APP_PORT
}


// use mysql if provided.
var vcap_services = process.env.VCAP_SERVICES;

if(vcap_services) {
  var svcs = JSON.parse(vcap_services)
  for(var key in svcs ) {
    var svc = svcs[key]
    console.log("service:" + svc)
    if( key.match(/^mysql/) ) {
      exports.dbType= "mysql";
      var cred = svc[0].credentials
      exports.dbSettings = {
        "user" : cred.user ,
        "host" : cred.host ,
        "password" : cred.password ,
        "database" : cred.name ,
      };
    }
    console.debug("database setup:" + console.dir(exports.dbSettings))
  }
}
