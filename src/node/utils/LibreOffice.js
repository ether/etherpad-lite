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
var os = require("os");
var path = require("path");
var settings = require("./Settings");
var spawn = require("child_process").spawn;

// Conversion tasks will be queued up, so we don't overload the system
var queue = async.queue(doConvertTask, 1);

/**
 * Convert a file from one type to another
 *
 * @param  {String}     srcFile     The path on disk to convert
 * @param  {String}     destFile    The path on disk where the converted file should be stored
 * @param  {String}     type        The type to convert into
 * @param  {Function}   callback    Standard callback function
 */
exports.convertFile = function(srcFile, destFile, type, callback) {
  queue.push({"srcFile": srcFile, "destFile": destFile, "type": type, "callback": callback});
};

function doConvertTask(task, callback) {
  var tmpDir = os.tmpdir();

  async.series([
    // Generate a PDF file with LibreOffice
    function(callback) {
      var soffice = spawn(settings.soffice, [
        '--headless',
        '--invisible',
        '--nologo',
        '--nolockcheck',
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

      // Throw an exception if libreoffice failed
      soffice.on('exit', function(code) {
        if (code != 0) {
          return callback("LibreOffice died with exit code " + code + " and message: " + stdoutBuffer);
        }

        callback();
      })
    },

    // Move the PDF file to the correct place
    function(callback) {
      var filename = path.basename(task.srcFile);
      var pdfFilename = filename.substr(0, filename.lastIndexOf('.')) + '.' + task.type;
      var pdfPath = path.join(tmpDir, pdfFilename);
      fs.rename(pdfPath, task.destFile, callback);
    }
  ], function(err) {
    // Invoke the callback for the local queue
    callback();

    // Invoke the callback for the task
    task.callback(err);
  });
}
