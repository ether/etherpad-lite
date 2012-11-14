require("ep_etherpad-lite/node_modules/npm").load({}, function(er,npm) {

  process.chdir(npm.root+'/..')

  var dirty = require("ep_etherpad-lite/node_modules/ueberDB/node_modules/dirty")('var/dirty.db');
  var db = require("ep_etherpad-lite/node/db/DB");

  db.init(function() {
    db = db.db;
    dirty.on("load", function() {
      dirty.forEach(function(key, value) {
        db.set(key, value);
      });
    });
  });

});
