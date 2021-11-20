'use strict';
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

const padManager = require('../db/PadManager');
const padMessageHandler = require('./PadMessageHandler');
const fs = require('fs').promises;
const path = require('path');
const settings = require('../utils/Settings');
const formidable = require('formidable');
const os = require('os');
const importHtml = require('../utils/ImportHtml');
const importEtherpad = require('../utils/ImportEtherpad');
const log4js = require('log4js');
const hooks = require('../../static/js/pluginfw/hooks.js');

const logger = log4js.getLogger('ImportHandler');

// `status` must be a string supported by `importErrorMessage()` in `src/static/js/pad_impexp.js`.
class ImportError extends Error {
  constructor(status, ...args) {
    super(...args);
    if (Error.captureStackTrace) Error.captureStackTrace(this, ImportError);
    this.name = 'ImportError';
    this.status = status;
    const msg = this.message == null ? '' : String(this.message);
    if (status !== '') this.message = msg === '' ? status : `${status}: ${msg}`;
  }
}

const rm = async (path) => {
  try {
    await fs.unlink(path);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
};

let converter = null;
let exportExtension = 'htm';

// load abiword only if it is enabled and if soffice is disabled
if (settings.abiword != null && settings.soffice == null) {
  converter = require('../utils/Abiword');
}

// load soffice only if it is enabled
if (settings.soffice != null) {
  converter = require('../utils/LibreOffice');
  exportExtension = 'html';
}

const tmpDirectory = os.tmpdir();

/**
 * do a requested import
 */
const doImport = async (req, res, padId) => {
  // pipe to a file
  // convert file to html via abiword or soffice
  // set html in the pad
  const randNum = Math.floor(Math.random() * 0xFFFFFFFF);

  // setting flag for whether to use converter or not
  let useConverter = (converter != null);

  const form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.uploadDir = tmpDirectory;
  form.maxFileSize = settings.importMaxFileSize;

  // Ref: https://github.com/node-formidable/formidable/issues/469
  // Crash in Etherpad was Uploading Error: Error: Request aborted
  // [ERR_STREAM_DESTROYED]: Cannot call write after a stream was destroyed
  form.onPart = (part) => {
    form.handlePart(part);
    if (part.filename !== undefined) {
      form.openedFiles[form.openedFiles.length - 1]._writeStream.on('error', (err) => {
        form.emit('error', err);
      });
    }
  };

  // locally wrapped Promise, since form.parse requires a callback
  let srcFile = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err != null) {
        logger.warn(`Import failed due to form error: ${err.stack || err}`);
        // I hate doing indexOf here but I can't see anything to use...
        if (err && err.stack && err.stack.indexOf('maxFileSize') !== -1) {
          return reject(new ImportError('maxFileSize'));
        }
        return reject(new ImportError('uploadFailed'));
      }
      if (!files.file) {
        logger.warn('Import failed because form had no file');
        return reject(new ImportError('uploadFailed'));
      }
      resolve(files.file.path);
    });
  });

  // ensure this is a file ending we know, else we change the file ending to .txt
  // this allows us to accept source code files like .c or .java
  const fileEnding = path.extname(srcFile).toLowerCase();
  const knownFileEndings =
    ['.txt', '.doc', '.docx', '.pdf', '.odt', '.html', '.htm', '.etherpad', '.rtf'];
  const fileEndingUnknown = (knownFileEndings.indexOf(fileEnding) < 0);

  if (fileEndingUnknown) {
    // the file ending is not known

    if (settings.allowUnknownFileEnds === true) {
      // we need to rename this file with a .txt ending
      const oldSrcFile = srcFile;

      srcFile = path.join(path.dirname(srcFile), `${path.basename(srcFile, fileEnding)}.txt`);
      await fs.rename(oldSrcFile, srcFile);
    } else {
      logger.warn(`Not allowing unknown file type to be imported: ${fileEnding}`);
      throw new ImportError('uploadFailed');
    }
  }

  const destFile = path.join(tmpDirectory, `etherpad_import_${randNum}.${exportExtension}`);
  const importHandledByPlugin =
      (await hooks.aCallAll('import', {srcFile, destFile, fileEnding, padId})).some((x) => x);
  const fileIsEtherpad = (fileEnding === '.etherpad');
  const fileIsHTML = (fileEnding === '.html' || fileEnding === '.htm');
  const fileIsTXT = (fileEnding === '.txt');

  let directDatabaseAccess = false;
  if (fileIsEtherpad) {
    // we do this here so we can see if the pad has quite a few edits
    const _pad = await padManager.getPad(padId);
    const headCount = _pad.head;

    if (headCount >= 10) {
      logger.warn('Aborting direct database import attempt of a pad that already has content');
      throw new ImportError('padHasData');
    }

    const _text = await fs.readFile(srcFile, 'utf8');
    directDatabaseAccess = true;
    await importEtherpad.setPadRaw(padId, _text);
  }

  // convert file to html if necessary
  if (!importHandledByPlugin && !directDatabaseAccess) {
    if (fileIsTXT) {
      // Don't use converter for text files
      useConverter = false;
    }

    // See https://github.com/ether/etherpad-lite/issues/2572
    if (fileIsHTML || !useConverter) {
      // if no converter only rename
      await fs.rename(srcFile, destFile);
    } else {
      try {
        await converter.convertFile(srcFile, destFile, exportExtension);
      } catch (err) {
        logger.warn(`Converting Error: ${err.stack || err}`);
        throw new ImportError('convertFailed');
      }
    }
  }

  if (!useConverter && !directDatabaseAccess) {
    // Read the file with no encoding for raw buffer access.
    const buf = await fs.readFile(destFile);

    // Check if there are only ascii chars in the uploaded file
    const isAscii = !Array.prototype.some.call(buf, (c) => (c > 240));

    if (!isAscii) {
      logger.warn('Attempt to import non-ASCII file');
      throw new ImportError('uploadFailed');
    }
  }

  // get the pad object
  let pad = await padManager.getPad(padId);

  // read the text
  let text;

  if (!directDatabaseAccess) {
    text = await fs.readFile(destFile, 'utf8');

    // node on windows has a delay on releasing of the file lock.
    // We add a 100ms delay to work around this
    if (os.type().indexOf('Windows') > -1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // change text of the pad and broadcast the changeset
  if (!directDatabaseAccess) {
    if (importHandledByPlugin || useConverter || fileIsHTML) {
      try {
        await importHtml.setPadHTML(pad, text);
      } catch (err) {
        logger.warn(`Error importing, possibly caused by malformed HTML: ${err.stack || err}`);
      }
    } else {
      await pad.setText(text);
    }
  }

  // Load the Pad into memory then broadcast updates to all clients
  padManager.unloadPad(padId);
  pad = await padManager.getPad(padId);
  padManager.unloadPad(padId);

  // Direct database access means a pad user should reload the pad and not attempt to receive
  // updated pad data.
  if (directDatabaseAccess) return true;

  // tell clients to update
  await padMessageHandler.updatePadClients(pad);

  // clean up temporary files
  rm(srcFile);
  rm(destFile);

  return false;
};

exports.doImport = async (req, res, padId) => {
  let httpStatus = 200;
  let code = 0;
  let message = 'ok';
  let directDatabaseAccess;
  try {
    directDatabaseAccess = await doImport(req, res, padId);
  } catch (err) {
    const known = err instanceof ImportError && err.status;
    if (!known) logger.error(`Internal error during import: ${err.stack || err}`);
    httpStatus = known ? 400 : 500;
    code = known ? 1 : 2;
    message = known ? err.status : 'internalError';
  }
  res.status(httpStatus).json({code, message, data: {directDatabaseAccess}});
};
