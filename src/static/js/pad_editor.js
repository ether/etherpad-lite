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

var padcookie = require('./pad_cookie').padcookie;
var padutils = require('./pad_utils').padutils;

var padeditor = (function()
{
  var Ace2Editor = undefined;
  var pad = undefined;
  var settings = undefined;

  // Array of available fonts
  var fonts = ['useMonospaceFont', 'useOpenDyslexicFont', 'useComicSansFont', 'useCourierNewFont', 'useGeorgiaFont', 'useImpactFont',
    'useLucidaFont', 'useLucidaSansFont', 'usePalatinoFont', 'useTahomaFont', 'useTimesNewRomanFont',
    'useTrebuchetFont', 'useVerdanaFont', 'useSymbolFont', 'useWebdingsFont', 'useWingDingsFont', 'useSansSerifFont',
    'useSerifFont'];

  var self = {
    ace: null,
    // this is accessed directly from other files
    viewZoom: 100,
    init: function(readyFunc, initialViewOptions, _pad)
    {
      Ace2Editor = require('./ace').Ace2Editor;
      pad = _pad;
      settings = pad.settings;

      function aceReady()
      {
        $("#editorloadingbox").hide();
        if (readyFunc)
        {
          readyFunc();
        }
      }

      self.ace = new Ace2Editor();
      self.ace.init("editorcontainer", "", aceReady);
      self.ace.setProperty("wraps", true);
      if (pad.getIsDebugEnabled())
      {
        self.ace.setProperty("dmesg", pad.dmesg);
      }
      self.initViewOptions();
      self.setViewOptions(initialViewOptions);

      // view bar
      $("#viewbarcontents").show();
    },
    initViewOptions: function()
    {
      // Line numbers
      padutils.bindCheckboxChange($("#options-linenoscheck"), function()
      {
        pad.changeViewOption('showLineNumbers', padutils.getCheckbox($("#options-linenoscheck")));
      });

      // Author colors
      padutils.bindCheckboxChange($("#options-colorscheck"), function()
      {
        padcookie.setPref('showAuthorshipColors', padutils.getCheckbox("#options-colorscheck"));
        pad.changeViewOption('showAuthorColors', padutils.getCheckbox("#options-colorscheck"));
      });

      // Right to left
      padutils.bindCheckboxChange($("#options-rtlcheck"), function()
      {
        pad.changeViewOption('rtlIsTrue', padutils.getCheckbox($("#options-rtlcheck")))
      });
      html10n.bind('localized', function() {
        pad.changeViewOption('rtlIsTrue', ('rtl' == html10n.getDirection()));
        padutils.setCheckbox($("#options-rtlcheck"), ('rtl' == html10n.getDirection()));
      })

      // font family change
      $("#viewfontmenu").change(function()
      {
        $.each(fonts, function(i, font){
          var sfont = font.replace("use","");
          sfont = sfont.replace("Font","");
          sfont = sfont.toLowerCase();
          pad.changeViewOption(font, $("#viewfontmenu").val() == sfont);
        });
      });
      
      // Language
      html10n.bind('localized', function() {
        $("#languagemenu").val(html10n.getLanguage());
        // translate the value of 'unnamed' and 'Enter your name' textboxes in the userlist
        // this does not interfere with html10n's normal value-setting because html10n just ingores <input>s
        // also, a value which has been set by the user will be not overwritten since a user-edited <input>
        // does *not* have the editempty-class
        $('input[data-l10n-id]').each(function(key, input){
          input = $(input);
          if(input.hasClass("editempty")){
            input.val(html10n.get(input.attr("data-l10n-id")));
          }
        });
      })
      $("#languagemenu").val(html10n.getLanguage());
      $("#languagemenu").change(function() {
        pad.createCookie("language",$("#languagemenu").val(),null,'/');
        window.html10n.localize([$("#languagemenu").val(), 'en']);
      });
    },
    setViewOptions: function(newOptions)
    {
      function getOption(key, defaultValue)
      {
        var value = String(newOptions[key]);
        if (value == "true") return true;
        if (value == "false") return false;
        return defaultValue;
      }

      var v;

      v = getOption('rtlIsTrue', ('rtl' == html10n.getDirection()));
      // Override from parameters if true
      if(settings.rtlIsTrue === true) v = true;
      self.ace.setProperty("rtlIsTrue", v);
      padutils.setCheckbox($("#options-rtlcheck"), v);

      v = getOption('showLineNumbers', true);
      self.ace.setProperty("showslinenumbers", v);
      padutils.setCheckbox($("#options-linenoscheck"), v);

      v = getOption('showAuthorColors', true);
      self.ace.setProperty("showsauthorcolors", v);
      padutils.setCheckbox($("#options-colorscheck"), v);

      // Override from parameters if true
      if (settings.noColors !== false){
        self.ace.setProperty("showsauthorcolors", !settings.noColors);
      }

      var normalFont = true;
      // Go through each font and see if the option is set..
      $.each(fonts, function(i, font){
        var isEnabled = getOption(font, false);
        if(isEnabled){
          font = font.replace("use","");
          font = font.replace("Font","");
          font = font.toLowerCase();
          if(font === "monospace") self.ace.setProperty("textface", "Courier new");
          if(font === "opendyslexic") self.ace.setProperty("textface", "OpenDyslexic");
          if(font === "comicsans") self.ace.setProperty("textface", "Comic Sans MS");
          if(font === "georgia") self.ace.setProperty("textface", "Georgia");
          if(font === "impact") self.ace.setProperty("textface", "Impact");
          if(font === "lucida") self.ace.setProperty("textface", "Lucida");
          if(font === "lucidasans") self.ace.setProperty("textface", "Lucida Sans Unicode");
          if(font === "palatino") self.ace.setProperty("textface", "Palatino Linotype");
          if(font === "tahoma") self.ace.setProperty("textface", "Tahoma");
          if(font === "timesnewroman") self.ace.setProperty("textface", "Times New Roman");
          if(font === "trebuchet") self.ace.setProperty("textface", "Trebuchet MS");
          if(font === "verdana") self.ace.setProperty("textface", "Verdana");
          if(font === "symbol") self.ace.setProperty("textface", "Symbol");
          if(font === "webdings") self.ace.setProperty("textface", "Webdings");
          if(font === "wingdings") self.ace.setProperty("textface", "Wingdings");
          if(font === "sansserif") self.ace.setProperty("textface", "MS Sans Serif");
          if(font === "serif") self.ace.setProperty("textface", "MS Serif");

          // $("#viewfontmenu").val(font);
          normalFont = false;
        }
      });

      // No font has been previously selected so use the Normal font
      if(normalFont){
        self.ace.setProperty("textface", "Arial, sans-serif");
        // $("#viewfontmenu").val("normal");
      }

    },
    dispose: function()
    {
      if (self.ace)
      {
        self.ace.destroy();
        self.ace = null;
      }
    },
    disable: function()
    {
      if (self.ace)
      {
        self.ace.setProperty("grayedOut", true);
        self.ace.setEditable(false);
      }
    },
    restoreRevisionText: function(dataFromServer)
    {
      pad.addHistoricalAuthors(dataFromServer.historicalAuthorData);
      self.ace.importAText(dataFromServer.atext, dataFromServer.apool, true);
    }
  };
  return self;
}());

exports.padeditor = padeditor;
