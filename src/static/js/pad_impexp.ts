'use strict';
/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */
import {i18nextvar} from "./vendors/i18next";
import {AjaxDirectDatabaseAccess} from "../module/CustomWindow";
import {clientVars} from "../../node/handler/PadMessageHandler";

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
    let pad;
    // /// import
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
    const fileInputSubmit = function (e) {
        e.preventDefault();
        $('#importmessagefail').fadeOut('fast');
        if (!window.confirm(i18nextvar('pad.impexp.confirmimport')))
            return;
        $('#importsubmitinput').attr({ disabled: true }).val(i18nextvar('pad.impexp.importing'));
        window.setTimeout(() => $('#importfileinput').attr({ disabled: true }), 0);
        $('#importarrow').stop(true, true).hide();
        $('#importstatusball').show();
        (async () => {
            const { code, message, data: { directDatabaseAccess } = {} }:AjaxDirectDatabaseAccess = await $.ajax({
                url: `${window.location.href.split('?')[0].split('#')[0]}/import`,
                method: 'POST',
                data: new FormData(this),
                processData: false,
                contentType: false,
                dataType: 'json',
                timeout: 25000,
            }).catch((err) => {
                if (err.responseJSON)
                    return err.responseJSON;
                return { code: 2, message: 'Unknown import error' };
            });
            if (code !== 0) {
                importErrorMessage(message);
            }
            else {
                $('#import_export').removeClass('popup-show');
                if (directDatabaseAccess)
                    window.location.reload();
            }
            $('#importsubmitinput').removeAttr('disabled').val(i18nextvar('pad.impexp.importbutton'));
            window.setTimeout(() => $('#importfileinput').removeAttr('disabled'), 0);
            $('#importstatusball').hide();
            addImportFrames();
        })();
    };
    const importErrorMessage = (status) => {
        const known = [
            'convertFailed',
            'uploadFailed',
            'padHasData',
            'maxFileSize',
            'permission',
        ];
        const msg = i18nextvar(`pad.impexp.${known.indexOf(status) !== -1 ? status : 'copypaste'}`);
        const showError = (fade?) => {
            const popup = $('#importmessagefail').empty()
                .append($('<strong>')
                .css('color', 'red')
                .text(`${i18nextvar('pad.impexp.importfailed')}: `))
                .append(document.createTextNode(msg));
            popup[(fade ? 'fadeIn' : 'show')]();
        };
        if ($('#importexport .importmessage').is(':visible')) {
            $('#importmessagesuccess').fadeOut('fast');
            $('#importmessagefail').fadeOut('fast', () => showError(true));
        }
        else {
            showError();
        }
    };
    // /// export
    function cantExport() {
        let type: JQuery<string>|string = $(this);
        if (type.hasClass('exporthrefpdf')) {
            type = 'PDF';
        }
        else if (type.hasClass('exporthrefdoc')) {
            type = 'Microsoft Word';
        }
        else if (type.hasClass('exporthrefodt')) {
            type = 'OpenDocument';
        }
        else {
            type = 'this file';
        }
        alert(i18nextvar('pad.impexp.exportdisabled', { type }));
        return false;
    }
    // ///
    const self = {
        init: (_pad) => {
            pad = _pad;
            // get /p/padname
            // if /p/ isn't available due to a rewrite we use the clientVars padId
            const padRootPath = /.*\/p\/[^/]+/.exec(document.location.pathname) || clientVars.padId;
            // i10l buttom import
            $('#importsubmitinput').val(i18nextvar('pad.impexp.importbutton'));
            i18nextvar.bind('localized', () => {
                $('#importsubmitinput').val(i18nextvar('pad.impexp.importbutton'));
            });
            // build the export links
            $('#exporthtmla').attr('href', `${padRootPath}/export/html`);
            $('#exportetherpada').attr('href', `${padRootPath}/export/etherpad`);
            $('#exportplaina').attr('href', `${padRootPath}/export/txt`);
            // hide stuff thats not avaible if abiword/soffice is disabled
            if (clientVars.exportAvailable === 'no') {
                $('#exportworda').remove();
                $('#exportpdfa').remove();
                $('#exportopena').remove();
                $('#importmessageabiword').show();
            }
            else if (clientVars.exportAvailable === 'withoutPDF') {
                $('#exportpdfa').remove();
                $('#exportworda').attr('href', `${padRootPath}/export/doc`);
                $('#exportopena').attr('href', `${padRootPath}/export/odt`);
                $('#importexport').css({ height: '142px' });
                $('#importexportline').css({ height: '142px' });
            }
            else {
                $('#exportworda').attr('href', `${padRootPath}/export/doc`);
                $('#exportpdfa').attr('href', `${padRootPath}/export/pdf`);
                $('#exportopena').attr('href', `${padRootPath}/export/odt`);
            }
            addImportFrames();
            $('#importfileinput').change(fileInputUpdated);
            $('#importform').unbind('submit').submit(fileInputSubmit);
            $('.disabledexport').click(cantExport);
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
export { padimpexp };
