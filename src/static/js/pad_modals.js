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
 
var padutils = require('./pad_utils').padutils;
var padeditbar = require('./pad_editbar').padeditbar;

var padmodals = (function()
{
  var pad = undefined;
  var self = {
    init: function(_pad)
    {
      pad = _pad;
    },
    showModal: function(messageId)
    {
      padeditbar.toggleDropDown("none", function() {
        $("#connectivity .visible").removeClass('visible');
        $("#connectivity ."+messageId).addClass('visible');
        padeditbar.toggleDropDown("connectivity");
      });
    },
    showOverlay: function(duration) {
      $("#overlay").show();
    },
    hideOverlay: function(duration) {
      $("#overlay").hide();
    }
  };
  return self;
}());

exports.padmodals = padmodals;
