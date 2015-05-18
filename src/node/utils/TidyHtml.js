/**
 * Tidy up the HTML in a given file
 */

var settings = require("./Settings");
var spawn = require('child_process').spawn;

exports.tidy = function(srcFile, callback) {
  // Don't do anything if Tidy hasn't been enabled
  if (!settings.tidyHtml) {
    return callback(null);
  }

  var errMessage = '';

  // Spawn a new tidy instance that cleans up the file inline
  var tidy = spawn(settings.tidyHtml, ['-modify', srcFile]);

  // Keep track of any error messages
  tidy.stderr.on('data', function (data) {
    errMessage += data.toString();
  });

  // Wait until Tidy is done
  tidy.on('close', function(code) {
    // Tidy returns a 0 when no errors occur and a 1 exit code when
    // the file could be tidied but a few warnings were generated
    if (code === 0 || code === 1) {
      return callback(null);
    } else {
      console.error(errMessage);
      return callback('Tidy died with exit code ' + code);
    }
  });
};
