/**
 * Tidy up the HTML in a given file
 */

var log4js = require('log4js');
var settings = require('./Settings');
var spawn = require('child_process').spawn;

exports.tidy = function(srcFile) {
  var logger = log4js.getLogger('TidyHtml');

  return new Promise((resolve, reject) => {

    // Don't do anything if Tidy hasn't been enabled
    if (!settings.tidyHtml) {
      logger.debug('tidyHtml has not been configured yet, ignoring tidy request');
      return resolve(null);
    }

    var errMessage = '';

    // Spawn a new tidy instance that cleans up the file inline
    logger.debug('Tidying ' + srcFile);
    var tidy = spawn(settings.tidyHtml, ['-modify', srcFile]);

    // Keep track of any error messages
    tidy.stderr.on('data', function (data) {
      errMessage += data.toString();
    });

    tidy.on('close', function(code) {
      // Tidy returns a 0 when no errors occur and a 1 exit code when
      // the file could be tidied but a few warnings were generated
      if (code === 0 || code === 1) {
        logger.debug('Tidied ' + srcFile + ' successfully');
        resolve(null);
      } else {
        logger.error('Failed to tidy ' + srcFile + '\n' + errMessage);
        reject('Tidy died with exit code ' + code);
      }
    });
  });
}
