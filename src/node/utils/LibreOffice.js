/**
 * Controls the communication with LibreOffice
 */

/*
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

var async = require("async");
var fs = require("fs");
var log4js = require('log4js');
var os = require("os");
var path = require("path");
var settings = require("./Settings");
var spawn = require("child_process").spawn;

// Conversion tasks will be queued up, so we don't overload the system
var queue = async.queue(doConvertTask, 1);

var libreOfficeLogger = log4js.getLogger('LibreOffice');

/**
 * Convert a file from one type to another
 *
 * @param  {String}     srcFile     The path on disk to convert
 * @param  {String}     destFile    The path on disk where the converted file should be stored
 * @param  {String}     type        The type to convert into
 * @param  {Function}   callback    Standard callback function
 */
exports.convertFile = function(srcFile, destFile, type, callback) {
  // Used for the moving of the file, not the conversion
  var fileExtension = type;

  if (type === "html") {
    // "html:XHTML Writer File:UTF8" does a better job than normal html exports
    type = "html:XHTML Writer File:UTF8";
  }

  // soffice can't convert from html to doc directly (verified with LO 5 and 6)
  // we need to convert to odt first, then to doc
  // to avoid `Error: no export filter for /tmp/xxxx.doc` error
  if (type === 'doc') {
    queue.push({
      "srcFile": srcFile,
      "destFile": destFile.replace(/\.doc$/, '.odt'),
      "type": 'odt',
      "callback": function () {
        queue.push({"srcFile": srcFile.replace(/\.html$/, '.odt'), "destFile": destFile, "type": type, "callback": callback, "fileExtension": fileExtension });
      }
    });
  } else {
    queue.push({"srcFile": srcFile, "destFile": destFile, "type": type, "callback": callback, "fileExtension": fileExtension});
  }
};

function doConvertTask(task, callback) {
  var tmpDir = os.tmpdir();

  async.series([
    /*
     * use LibreOffice to convert task.srcFile to another format, given in
     * task.type
     */
    function(callback) {
      libreOfficeLogger.debug(`Converting ${task.srcFile} to format ${task.type}. The result will be put in ${tmpDir}`);
      var soffice = spawn(settings.soffice, [
        '--headless',
        '--invisible',
        '--nologo',
        '--nolockcheck',
        '--writer',
        '--convert-to', task.type,
        task.srcFile,
        '--outdir', tmpDir
      ]);

      var stdoutBuffer = '';

      // Delegate the processing of stdout to another function
      soffice.stdout.on('data', function(data) {
        stdoutBuffer += data.toString();
      });

      // Append error messages to the buffer
      soffice.stderr.on('data', function(data) {
        stdoutBuffer += data.toString();
      });

      soffice.on('exit', function(code) {
        if (code != 0) {
          // Throw an exception if libreoffice failed
          return callback(`LibreOffice died with exit code ${code} and message: ${stdoutBuffer}`);
        }

        // if LibreOffice exited succesfully, go on with processing
        callback();
      })
    },

    // Move the converted file to the correct place
    function(callback) {
      var filename = path.basename(task.srcFile);
      var sourceFilename = filename.substr(0, filename.lastIndexOf('.')) + '.' + task.fileExtension;
      var sourcePath = path.join(tmpDir, sourceFilename);
      libreOfficeLogger.debug(`Renaming ${sourcePath} to ${task.destFile}`);
      fs.rename(sourcePath, task.destFile, callback);
    }
  ], function(err) {
    // Invoke the callback for the local queue
    callback();

    // Invoke the callback for the task
    task.callback(err);
  });
}
