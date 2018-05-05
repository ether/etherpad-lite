var fs = require('fs');

var check = function(path) {
  var existsSync = fs.statSync || fs.existsSync || path.existsSync;

  var result;
  try {
    result = existsSync(path);
  } catch (e) {
    result = false;
  }
  return result;
}

module.exports = check;
