'use strict';
/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

import {PadType} from "../../node/types/PadType";

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

import {Cookies} from "./pad_utils";

import padcookie from "./pad_cookie";
import {padUtils as padutils} from "./pad_utils";

import {Ace2Editor} from "./ace";
import html10n from '../js/vendors/html10n'
import {MapArrayType} from "../../node/types/MapType";
import {ClientVarPayload, PadOption} from "./types/SocketIOMessage";
import {Pad} from "./pad";

export class PadEditor {
  private pad?: Pad
  private settings: undefined| PadOption
  ace: Ace2Editor|null
  private viewZoom: number

  constructor() {
    this.pad = undefined;
    this.settings = undefined;
    this.ace = null
    // this is accessed directly from other files
    this.viewZoom = 100
  }

  init = async (initialViewOptions: MapArrayType<boolean>, _pad: Pad) => {
    this.pad = _pad;
    this.settings = this.pad.settings;
    this.ace = new Ace2Editor();
    await this.ace.init('editorcontainer', '');
    $('#editorloadingbox').hide();
    // Listen for clicks on sidediv items
    const $outerdoc = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');
    $outerdoc.find('#sidedivinner').on('click', 'div', function () {
      const targetLineNumber = $(this).index() + 1;
      window.location.hash = `L${targetLineNumber}`;
    });
    this.focusOnLine(this.ace);
    this.ace.setProperty('wraps', true);
    this.initViewOptions();
    this.setViewOptions(initialViewOptions);
    // view bar
    $('#viewbarcontents').show();
  }


  initViewOptions = () => {
    // Line numbers
    padutils.bindCheckboxChange($('#options-linenoscheck'), () => {
      this.pad!.changeViewOption('showLineNumbers', padutils.getCheckbox('#options-linenoscheck'));
    });

// Author colors
    padutils.bindCheckboxChange($('#options-colorscheck'), () => {
      padcookie.setPref('showAuthorshipColors', padutils.getCheckbox('#options-colorscheck') as any);
      this.pad!.changeViewOption('showAuthorColors', padutils.getCheckbox('#options-colorscheck'));
    });

// Right to left
    padutils.bindCheckboxChange($('#options-rtlcheck'), () => {
      this.pad!.changeViewOption('rtlIsTrue', padutils.getCheckbox('#options-rtlcheck'));
    });
    html10n.bind('localized', () => {
      this.pad!.changeViewOption('rtlIsTrue', ('rtl' === html10n.getDirection()));
      padutils.setCheckbox($('#options-rtlcheck'), ('rtl' === html10n.getDirection()));
    });

// font family change
    $('#viewfontmenu').on('change', () => {
      this.pad!.changeViewOption('padFontFamily', $('#viewfontmenu').val());
    });

// Language
    html10n.bind('localized', () => {
      $('#languagemenu').val(html10n.getLanguage()!);
      // translate the value of 'unnamed' and 'Enter your name' textboxes in the userlist

      // this does not interfere with html10n's normal value-setting because
      // html10n just ingores <input>s
      // also, a value which has been set by the user will be not overwritten
      // since a user-edited <input> does *not* have the editempty-class
      $('input[data-l10n-id]').each((key, input) => {
        // @ts-ignore
        input = $(input);
        // @ts-ignore
        if (input.hasClass('editempty')) {
          // @ts-ignore
          input.val(html10n.get(input.attr('data-l10n-id')));
        }
      });
    });
    $('#languagemenu').val(html10n.getLanguage()!);
    $('#languagemenu').on('change', () => {
      Cookies.set('language', $('#languagemenu').val() as string);
      html10n.localize([$('#languagemenu').val() as string, 'en']);
      // @ts-ignore
      if ($('select').niceSelect) {
        // @ts-ignore
        $('select').niceSelect('update');
      }
    });
  }

  setViewOptions = (newOptions: MapArrayType<boolean>) => {
    const getOption = (key: string, defaultValue: boolean) => {
      const value = String(newOptions[key]);
      if (value === 'true') return true;
      if (value === 'false') return false;
      return defaultValue;
    };

    let v;

    v = getOption('rtlIsTrue', ('rtl' === html10n.getDirection()));
    this.ace!.setProperty('rtlIsTrue', v);
    padutils.setCheckbox($('#options-rtlcheck'), v);

    v = getOption('showLineNumbers', true);
    this.ace!.setProperty('showslinenumbers', v);
    padutils.setCheckbox($('#options-linenoscheck'), v);

    v = getOption('showAuthorColors', true);
    this.ace!.setProperty('showsauthorcolors', v);
    $('#chattext').toggleClass('authorColors', v);
    $('iframe[name="ace_outer"]').contents().find('#sidedivinner').toggleClass('authorColors', v);
    padutils.setCheckbox($('#options-colorscheck'), v);

    // Override from parameters if true
    if (this.settings!.noColors !== false) {
      this.ace!.setProperty('showsauthorcolors', !this.settings!.noColors);
    }

    this.ace!.setProperty('textface', newOptions.padFontFamily || '');
  }

  dispose = () => {
    if (this.ace) {
      this.ace.destroy();
      this.ace = null;
    }
  }
  enable = () => {
    if (this.ace) {
      this.ace.setEditable(true);
    }
  }
  disable = () => {
    if (this.ace) {
      this.ace.setEditable(false);
    }
  }
  restoreRevisionText= (dataFromServer: ClientVarPayload) => {
      this.pad!.addHistoricalAuthors(dataFromServer.historicalAuthorData);
      this.ace!.importAText(dataFromServer.atext, dataFromServer.apool, true);
    }

  focusOnLine = (ace: Ace2Editor) => {
    // If a number is in the URI IE #L124 go to that line number
    const lineNumber = window.location.hash.substr(1);
    if (lineNumber) {
      if (lineNumber[0] === 'L') {
        const $outerdoc = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');
        const lineNumberInt = parseInt(lineNumber.substr(1));
        if (lineNumberInt) {
          const $inner = $('iframe[name="ace_outer"]').contents().find('iframe')
            .contents().find('#innerdocbody');
          const line = $inner.find(`div:nth-child(${lineNumberInt})`);
          if (line.length !== 0) {
            let offsetTop = line.offset()!.top;
            offsetTop += parseInt($outerdoc.css('padding-top').replace('px', ''));
            const hasMobileLayout = $('body').hasClass('mobile-layout');
            if (!hasMobileLayout) {
              offsetTop += parseInt($inner.css('padding-top').replace('px', ''));
            }
            const $outerdocHTML = $('iframe[name="ace_outer"]').contents()
              .find('#outerdocbody').parent();
            $outerdoc.css({top: `${offsetTop}px`}); // Chrome
            $outerdocHTML.animate({scrollTop: offsetTop}); // needed for FF
            const node = line[0];
            ace.callWithAce((ace) => {
              const selection = {
                startPoint: {
                  index: 0,
                  focusAtStart: true,
                  maxIndex: 1,
                  node,
                },
                endPoint: {
                  index: 0,
                  focusAtStart: true,
                  maxIndex: 1,
                  node,
                },
              };
              ace.ace_setSelection(selection);
            });
          }
        }
      }
    }
    // End of setSelection / set Y position of editor
  }
}

export const padEditor = new PadEditor();