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

var padmodals = (function()
{
  var pad = undefined;
  var self = {
    init: function(_pad)
    {
      pad = _pad;
    },
    showModal: function(modalId, duration)
    {
      $(".modaldialog").hide();
      $(modalId).show().css(
      {
        'opacity': 0
      }).animate(
      {
        'opacity': 1
      }, duration);
      $("#modaloverlay").show().css(
      {
        'opacity': 0
      }).animate(
      {
        'opacity': 1
      }, duration);
    },
    hideModal: function(duration)
    {
      padutils.cancelActions('hide-feedbackbox');
      padutils.cancelActions('hide-sharebox');
      $("#sharebox-response").hide();
      $(".modaldialog").animate(
      {
        'opacity': 0
      }, duration, function()
      {
        $("#modaloverlay").hide();
      });
      $("#modaloverlay").animate(
      {
        'opacity': 0
      }, duration, function()
      {
        $("#modaloverlay").hide();
      });
    },
  };
  return self;
}());

exports.padmodals = padmodals;
