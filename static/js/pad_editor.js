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

var padcookie = require('/pad_cookie').padcookie;
var padutils = require('/pad_utils').padutils;

var padeditor = (function()
{
  var Ace2Editor = undefined;
  var pad = undefined;
  var settings = undefined;
  var self = {
    ace: null,
    // this is accessed directly from other files
    viewZoom: 100,
    init: function(readyFunc, initialViewOptions, _pad)
    {
      Ace2Editor = require('/ace').Ace2Editor;
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
      self.initViewZoom();
      $("#viewbarcontents").show();
    },
    initViewOptions: function()
    {
      padutils.bindCheckboxChange($("#options-linenoscheck"), function()
      {
        pad.changeViewOption('showLineNumbers', padutils.getCheckbox($("#options-linenoscheck")));
      });
      padutils.bindCheckboxChange($("#options-colorscheck"), function()
      {
        padcookie.setPref('showAuthorshipColors', padutils.getCheckbox("#options-colorscheck"));
        pad.changeViewOption('showAuthorColors', padutils.getCheckbox("#options-colorscheck"));
      });
      $("#viewfontmenu").change(function()
      {
        pad.changeViewOption('useMonospaceFont', $("#viewfontmenu").val() == 'monospace');
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

      self.ace.setProperty("rtlIsTrue", settings.rtlIsTrue);

      var v;

      v = getOption('showLineNumbers', true);
      self.ace.setProperty("showslinenumbers", v);
      padutils.setCheckbox($("#options-linenoscheck"), v);

      v = getOption('showAuthorColors', true);
      self.ace.setProperty("showsauthorcolors", v);
      padutils.setCheckbox($("#options-colorscheck"), v);
      // Override from parameters
      self.ace.setProperty("showsauthorcolors", !settings.noColors);

      v = getOption('useMonospaceFont', false);
      self.ace.setProperty("textface", (v ? "monospace" : "Arial, sans-serif"));
      $("#viewfontmenu").val(v ? "monospace" : "normal");
    },
    initViewZoom: function()
    {
      var viewZoom = Number(padcookie.getPref('viewZoom'));
      if ((!viewZoom) || isNaN(viewZoom))
      {
        viewZoom = 100;
      }
      self.setViewZoom(viewZoom);
      $("#viewzoommenu").change(function(evt)
      {
        // strip initial 'z' from val
        self.setViewZoom(Number($("#viewzoommenu").val().substring(1)));
      });
    },
    setViewZoom: function(percent)
    {
      if (!(percent >= 50 && percent <= 1000))
      {
        // percent is out of sane range or NaN (which fails comparisons)
        return;
      }

      self.viewZoom = percent;
      $("#viewzoommenu").val('z' + percent);

      var baseSize = 13;
      self.ace.setProperty('textsize', Math.round(baseSize * self.viewZoom / 100));

      padcookie.setPref('viewZoom', percent);
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
