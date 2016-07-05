var jsonminify = require(__dirname+"/../../src/node_modules/jsonminify");

function loadSettings(){
  var settingsStr = fs.readFileSync(__dirname+"/../../settings.json").toString();
  // try to parse the settings
  var settings;
  try {
    if(settingsStr) {
      settingsStr = jsonminify(settingsStr).replace(",]","]").replace(",}","}");
      return JSON.parse(settingsStr);
    }
  }catch(e){
    console.error("whoops something is bad with settings");
  }
}

exports.loadSettings = loadSettings;
