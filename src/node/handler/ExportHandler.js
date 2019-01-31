/**
 * Handles the export requests
 */

/*
 * 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
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

var exporthtml = require("../utils/ExportHtml");
var exporttxt = require("../utils/ExportTxt");
var exportEtherpad = require("../utils/ExportEtherpad");
var fs = require("fs");
var settings = require('../utils/Settings');
var os = require('os');
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");
var TidyHtml = require('../utils/TidyHtml');
const util = require("util");

const fsp_writeFile = util.promisify(fs.writeFile);
const fsp_unlink = util.promisify(fs.unlink);

let convertor = null;

// load abiword only if it is enabled
if (settings.abiword != null) {
  convertor = require("../utils/Abiword");
}

// Use LibreOffice if an executable has been defined in the settings
if (settings.soffice != null) {
  convertor = require("../utils/LibreOffice");
}

const tempDirectory = os.tmpdir();

/**
 * do a requested export
 */
async function doExport(req, res, padId, type)
{
  var fileName = padId;

  // allow fileName to be overwritten by a hook, the type type is kept static for security reasons
  let hookFileName = await hooks.aCallFirst("exportFileName", padId);

  // if fileName is set then set it to the padId, note that fileName is returned as an array.
  if (hookFileName.length) {
    fileName = hookFileName;
  }

  // tell the browser that this is a downloadable file
  res.attachment(fileName + "." + type);

  // if this is a plain text export, we can do this directly
  // We have to over engineer this because tabs are stored as attributes and not plain text
  if (type === "etherpad") {
    let pad = await exportEtherpad.getPadRaw(padId);
    res.send(pad);
  } else if (type === "txt") {
    let txt = await exporttxt.getPadTXTDocument(padId, req.params.rev);
    res.send(txt);
  } else {
    // render the html document
    let html = await exporthtml.getPadHTMLDocument(padId, req.params.rev);

    // decide what to do with the html export

    // if this is a html export, we can send this from here directly
    if (type === "html") {
      // do any final changes the plugin might want to make
      let newHTML = await hooks.aCallFirst("exportHTMLSend", html);
      if (newHTML.length) html = newHTML;
      res.send(html);
      throw "stop";
    }

    // else write the html export to a file
    let randNum = Math.floor(Math.random()*0xFFFFFFFF);
    let srcFile = tempDirectory + "/etherpad_export_" + randNum + ".html";
    await fsp_writeFile(srcFile, html);

    // Tidy up the exported HTML
    // ensure html can be collected by the garbage collector
    html = null;
    await TidyHtml.tidy(srcFile);

    // send the convert job to the convertor (abiword, libreoffice, ..)
    let destFile = tempDirectory + "/etherpad_export_" + randNum + "." + type;

    // Allow plugins to overwrite the convert in export process
    let result = await hooks.aCallAll("exportConvert", { srcFile, destFile, req, res });
    if (result.length > 0) {
      // console.log("export handled by plugin", destFile);
      handledByPlugin = true;
    } else {
      // @TODO no Promise interface for convertors (yet)
      await new Promise((resolve, reject) => {
        convertor.convertFile(srcFile, destFile, type, function(err) {
          err ?  reject("convertFailed") : resolve();
        });
      });
    }

    // send the file
    let sendFile = util.promisify(res.sendFile);
    await res.sendFile(destFile, null);

    // clean up temporary files
    await fsp_unlink(srcFile);

    // 100ms delay to accommodate for slow windows fs
    if (os.type().indexOf("Windows") > -1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await fsp_unlink(destFile);
  }
}

exports.doExport = function(req, res, padId, type)
{
  doExport(req, res, padId, type).catch(err => {
    if (err !== "stop") {
      throw err;
    }
  });
}
