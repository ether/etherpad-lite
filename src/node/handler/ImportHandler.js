/**
 * Handles the import requests
 */

/*
 * 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
 * 2012 Iván Eixarch
 * 2014 John McLear (Etherpad Foundation / McLear Ltd)
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

var padManager = require("../db/PadManager")
  , padMessageHandler = require("./PadMessageHandler")
  , fs = require("fs")
  , path = require("path")
  , settings = require('../utils/Settings')
  , formidable = require('formidable')
  , os = require("os")
  , importHtml = require("../utils/ImportHtml")
  , importEtherpad = require("../utils/ImportEtherpad")
  , log4js = require("log4js")
  , hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks.js")
  , util = require("util");

let fsp_exists = util.promisify(fs.exists);
let fsp_rename = util.promisify(fs.rename);
let fsp_readFile = util.promisify(fs.readFile);
let fsp_unlink = util.promisify(fs.unlink)

let convertor = null;
let exportExtension = "htm";

// load abiword only if it is enabled and if soffice is disabled
if (settings.abiword != null && settings.soffice === null) {
  convertor = require("../utils/Abiword");
}

// load soffice only if it is enabled
if (settings.soffice != null) {
  convertor = require("../utils/LibreOffice");
  exportExtension = "html";
}

const tmpDirectory = os.tmpdir();

/**
 * do a requested import
 */
async function doImport(req, res, padId)
{
  var apiLogger = log4js.getLogger("ImportHandler");

  // pipe to a file
  // convert file to html via abiword or soffice
  // set html in the pad
  var randNum = Math.floor(Math.random()*0xFFFFFFFF);

  // setting flag for whether to use convertor or not
  let useConvertor = (convertor != null);

  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.uploadDir = tmpDirectory;
  form.maxFileSize = settings.importMaxFileSize;

  // locally wrapped Promise, since form.parse requires a callback
  let srcFile = await new Promise((resolve, reject) => {
    form.parse(req, function(err, fields, files) {
      if (err || files.file === undefined) {
        // the upload failed, stop at this point
        if (err) {
          console.warn("Uploading Error: " + err.stack);
        }

        // I hate doing indexOf here but I can't see anything to use...
        if (err.stack.indexOf("maxFileSize") !== -1) {
          reject("maxFileSize");
        }

        reject("uploadFailed");
      }
      if(!files.file){ // might not be a graceful fix but it works
        reject("uploadFailed");
      }else{
        resolve(files.file.path);
      }
    });
  });

  // ensure this is a file ending we know, else we change the file ending to .txt
  // this allows us to accept source code files like .c or .java
  let fileEnding = path.extname(srcFile).toLowerCase()
    , knownFileEndings = [".txt", ".doc", ".docx", ".pdf", ".odt", ".html", ".htm", ".etherpad", ".rtf"]
    , fileEndingUnknown = (knownFileEndings.indexOf(fileEnding) < 0);

  if (fileEndingUnknown) {
    // the file ending is not known

    if (settings.allowUnknownFileEnds === true) {
      // we need to rename this file with a .txt ending
      let oldSrcFile = srcFile;

      srcFile = path.join(path.dirname(srcFile), path.basename(srcFile, fileEnding) + ".txt");
      await fsp_rename(oldSrcFile, srcFile);
    } else {
      console.warn("Not allowing unknown file type to be imported", fileEnding);
      throw "uploadFailed";
    }
  }

  let destFile = path.join(tmpDirectory, "etherpad_import_" + randNum + "." + exportExtension);

  // Logic for allowing external Import Plugins
  let result = await hooks.aCallAll("import", { srcFile, destFile, fileEnding });
  let importHandledByPlugin = (result.length > 0);  // This feels hacky and wrong..

  let fileIsEtherpad = (fileEnding === ".etherpad");
  let fileIsHTML = (fileEnding === ".html" || fileEnding === ".htm");
  let fileIsTXT = (fileEnding === ".txt");

  if (fileIsEtherpad) {
    // we do this here so we can see if the pad has quite a few edits
    let _pad = await padManager.getPad(padId);
    let headCount = _pad.head;

    if (headCount >= 10) {
      apiLogger.warn("Direct database Import attempt of a pad that already has content, we won't be doing this");
      throw "padHasData";
    }

    const fsp_readFile = util.promisify(fs.readFile);
    let _text = await fsp_readFile(srcFile, "utf8");
    req.directDatabaseAccess = true;
    await importEtherpad.setPadRaw(padId, _text);
  }

  // convert file to html if necessary
  if (!importHandledByPlugin && !req.directDatabaseAccess) {
    if (fileIsTXT) {
      // Don't use convertor for text files
      useConvertor = false;
    }

    // See https://github.com/ether/etherpad-lite/issues/2572
    if (fileIsHTML || !useConvertor) {
      // if no convertor only rename
      fs.renameSync(srcFile, destFile);
    } else {
      // @TODO - no Promise interface for convertors (yet)
      await new Promise((resolve, reject) => {
        convertor.convertFile(srcFile, destFile, exportExtension, function(err) {
          // catch convert errors
          if (err) {
            console.warn("Converting Error:", err);
            reject("convertFailed");
          }
          resolve();
        });
      });
    }
  }

  if (!useConvertor && !req.directDatabaseAccess) {
    // Read the file with no encoding for raw buffer access.
    let buf = await fsp_readFile(destFile);

    // Check if there are only ascii chars in the uploaded file
    let isAscii = ! Array.prototype.some.call(buf, c => (c > 240));

    if (!isAscii) {
      throw "uploadFailed";
    }
  }

  // get the pad object
  let pad = await padManager.getPad(padId);

  // read the text
  let text;

  if (!req.directDatabaseAccess) {
    text = await fsp_readFile(destFile, "utf8");

    /*
     * The <title> tag needs to be stripped out, otherwise it is appended to the
     * pad.
     *
     * Moreover, when using LibreOffice to convert the file, some classes are
     * added to the <title> tag. This is a quick & dirty way of matching the
     * title and comment it out independently on the classes that are set on it.
     */
    text = text.replace("<title", "<!-- <title");
    text = text.replace("</title>","</title>-->");

    // node on windows has a delay on releasing of the file lock.
    // We add a 100ms delay to work around this
    if (os.type().indexOf("Windows") > -1){
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // change text of the pad and broadcast the changeset
  if (!req.directDatabaseAccess) {
    if (importHandledByPlugin || useConvertor || fileIsHTML) {
      try {
        importHtml.setPadHTML(pad, text);
      } catch (e) {
        apiLogger.warn("Error importing, possibly caused by malformed HTML");
      }
    } else {
      pad.setText(text);
    }
  }

  // Load the Pad into memory then broadcast updates to all clients
  padManager.unloadPad(padId);
  pad = await padManager.getPad(padId);
  padManager.unloadPad(padId);

  // direct Database Access means a pad user should perform a switchToPad
  // and not attempt to receive updated pad data
  if (req.directDatabaseAccess) {
    return;
  }

  // tell clients to update
  await padMessageHandler.updatePadClients(pad);

  // clean up temporary files

  /*
   * TODO: directly delete the file and handle the eventual error. Checking
   * before for existence is prone to race conditions, and does not handle any
   * errors anyway.
   */
  if (await fsp_exists(srcFile)) {
    fsp_unlink(srcFile);
  }

  if (await fsp_exists(destFile)) {
    fsp_unlink(destFile);
  }
}

exports.doImport = function (req, res, padId)
{
  /**
   * NB: abuse the 'req' object by storing an additional
   * 'directDatabaseAccess' property on it so that it can
   * be passed back in the HTML below.
   *
   * this is necessary because in the 'throw' paths of
   * the function above there's no other way to return
   * a value to the caller.
   */
  let status = "ok";
  doImport(req, res, padId).catch(err => {
    // check for known errors and replace the status
    if (err == "uploadFailed" || err == "convertFailed" || err == "padHasData" || err == "maxFileSize") {
      status = err;
    } else {
      throw err;
    }
  }).then(() => {
    // close the connection
    res.send(
    "<head> \
      <script type='text/javascript' src='../../static/js/jquery.js'></script> \
    </head> \
    <script> \
      $(window).load(function(){ \
        var impexp = window.parent.padimpexp.handleFrameCall('" + req.directDatabaseAccess +"', '" + status + "'); \
      }) \
    </script>"
    );
  });
}
