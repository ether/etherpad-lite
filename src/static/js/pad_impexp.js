'use strict';

/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

/**
 * Copyright 2009 Google Inc.
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

const padimpexp = (() => {
  // /// import
  let currentImportTimer = null;

  const addImportFrames = () => {
    $('#import .importframe').remove();
    const iframe = $('<iframe>')
        .css('display', 'none')
        .attr('name', 'importiframe')
        .addClass('importframe');
    $('#import').append(iframe);
  };

  const fileInputUpdated = () => {
    $('#importsubmitinput').addClass('throbbold');
    $('#importformfilediv').addClass('importformenabled');
    $('#importsubmitinput').removeAttr('disabled');
    $('#importmessagefail').fadeOut('fast');
  };

  const fileInputSubmit = () => {
    $('#importmessagefail').fadeOut('fast');
    const ret = window.confirm(html10n.get('pad.impexp.confirmimport'));
    if (ret) {
      currentImportTimer = window.setTimeout(() => {
        if (!currentImportTimer) {
          return;
        }
        currentImportTimer = null;
        importFailed('Request timed out.');
        importDone();
      }, 25000); // time out after some number of seconds
      $('#importsubmitinput').attr(
          {
            disabled: true,
          }).val(html10n.get('pad.impexp.importing'));

      window.setTimeout(() => {
        $('#importfileinput').attr(
            {
              disabled: true,
            });
      }, 0);
      $('#importarrow').stop(true, true).hide();
      $('#importstatusball').show();
    }
    return ret;
  };

  const importFailed = (msg) => {
    importErrorMessage(msg);
  };

  const importDone = () => {
    $('#importsubmitinput').removeAttr('disabled').val(html10n.get('pad.impexp.importbutton'));
    window.setTimeout(() => {
      $('#importfileinput').removeAttr('disabled');
    }, 0);
    $('#importstatusball').hide();
    importClearTimeout();
    addImportFrames();
  };

  const importClearTimeout = () => {
    if (currentImportTimer) {
      window.clearTimeout(currentImportTimer);
      currentImportTimer = null;
    }
  };

  const importErrorMessage = (status) => {
    let msg = '';

    if (status === 'convertFailed') {
      msg = html10n.get('pad.impexp.convertFailed');
    } else if (status === 'uploadFailed') {
      msg = html10n.get('pad.impexp.uploadFailed');
    } else if (status === 'padHasData') {
      msg = html10n.get('pad.impexp.padHasData');
    } else if (status === 'maxFileSize') {
      msg = html10n.get('pad.impexp.maxFileSize');
    } else if (status === 'permission') {
      msg = html10n.get('pad.impexp.permission');
    }

    const showError = (fade) => {
      $('#importmessagefail').html(
          `<strong style="color: red">${html10n.get('pad.impexp.importfailed')}:</strong> ` +
          `${msg || html10n.get('pad.impexp.copypaste', '')}`)[(fade ? 'fadeIn' : 'show')]();
    };

    if ($('#importexport .importmessage').is(':visible')) {
      $('#importmessagesuccess').fadeOut('fast');
      $('#importmessagefail').fadeOut('fast', () => {
        showError(true);
      });
    } else {
      showError();
    }
  };

  // /// export

  function cantExport() {
    let type = $(this);
    if (type.hasClass('exporthrefpdf')) {
      type = 'PDF';
    } else if (type.hasClass('exporthrefdoc')) {
      type = 'Microsoft Word';
    } else if (type.hasClass('exporthrefodt')) {
      type = 'OpenDocument';
    } else {
      type = 'this file';
    }
    alert(html10n.get('pad.impexp.exportdisabled', {type}));
    return false;
  }

  // ///
  let pad = undefined;
  const self = {
    init: (_pad) => {
      pad = _pad;

      // get /p/padname
      // if /p/ isn't available due to a rewrite we use the clientVars padId
      const padRootPath = /.*\/p\/[^/]+/.exec(document.location.pathname) || clientVars.padId;
      // get http://example.com/p/padname without Params
      const dl = document.location;
      const padRootUrl = `${dl.protocol}//${dl.host}${dl.pathname}`;

      // i10l buttom import
      $('#importsubmitinput').val(html10n.get('pad.impexp.importbutton'));
      html10n.bind('localized', () => {
        $('#importsubmitinput').val(html10n.get('pad.impexp.importbutton'));
      });

      // build the export links
      $('#exporthtmla').attr('href', `${padRootPath}/export/html`);
      $('#exportetherpada').attr('href', `${padRootPath}/export/etherpad`);
      $('#exportplaina').attr('href', `${padRootPath}/export/txt`);

      // activate action to import in the form
      $('#importform').attr('action', `${padRootUrl}/import`);

      // hide stuff thats not avaible if abiword/soffice is disabled
      if (clientVars.exportAvailable === 'no') {
        $('#exportworda').remove();
        $('#exportpdfa').remove();
        $('#exportopena').remove();

        $('#importmessageabiword').show();
      } else if (clientVars.exportAvailable === 'withoutPDF') {
        $('#exportpdfa').remove();

        $('#exportworda').attr('href', `${padRootPath}/export/doc`);
        $('#exportopena').attr('href', `${padRootPath}/export/odt`);

        $('#importexport').css({height: '142px'});
        $('#importexportline').css({height: '142px'});
      } else {
        $('#exportworda').attr('href', `${padRootPath}/export/doc`);
        $('#exportpdfa').attr('href', `${padRootPath}/export/pdf`);
        $('#exportopena').attr('href', `${padRootPath}/export/odt`);
      }

      addImportFrames();
      $('#importfileinput').change(fileInputUpdated);
      $('#importform').unbind('submit').submit(fileInputSubmit);
      $('.disabledexport').click(cantExport);
    },
    handleFrameCall: (directDatabaseAccess, status) => {
      if (directDatabaseAccess === 'undefined') directDatabaseAccess = false;
      if (status !== 'ok') {
        importFailed(status);
      } else {
        $('#import_export').removeClass('popup-show');
      }

      if (directDatabaseAccess) {
        // Switch to the pad without redrawing the page
        pad.switchToPad(clientVars.padId);
        $('#import_export').removeClass('popup-show');
      }

      importDone();
    },
    disable: () => {
      $('#impexp-disabled-clickcatcher').show();
      $('#import').css('opacity', 0.5);
      $('#impexp-export').css('opacity', 0.5);
    },
    enable: () => {
      $('#impexp-disabled-clickcatcher').hide();
      $('#import').css('opacity', 1);
      $('#impexp-export').css('opacity', 1);
    },
  };
  return self;
})();

exports.padimpexp = padimpexp;
