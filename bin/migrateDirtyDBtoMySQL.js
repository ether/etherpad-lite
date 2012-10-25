var dirty = require("../src/node_modules/ueberDB/node_modules/dirty")('var/dirty.db');
var db = require("../src/node/db/DB");

db.init(function() {
  db = db.db;
  dirty.on("load", function() {
    dirty.forEach(function(key, value) {
      db.set(key, value);
    });
  });
});
