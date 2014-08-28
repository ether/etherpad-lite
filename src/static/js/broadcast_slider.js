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

var _ = require('./underscore');
var padmodals = require('./pad_modals').padmodals;

function init(connection, fireWhenAllScriptsAreLoaded)
{
  var BroadcastSlider;

  (function()
  { // wrap this code in its own namespace



    var clientVars = connection.clientVars;

    function disableSelection(element)
    {
      element.onselectstart = function()
      {
        return false;
      };
      element.unselectable = "on";
      element.style.MozUserSelect = "none";
      element.style.cursor = "default";
    }

    // just take over the whole slider screen with a reconnect message

    function showReconnectUI()
    {
      padmodals.showModal("disconnected");
    }

    //TODO: figure out what the hell this is for
    var fixPadHeight = _.throttle(function(){
      var height = $('#timeslider-top').height();
      $('#editorcontainerbox').css({marginTop: height});
    }, 600);

    // assign event handlers to html UI elements after page load
    //$(window).load(function ()
    fireWhenAllScriptsAreLoaded.push(function()
    {
      disableSelection($("#playpause_button")[0]);
      disableSelection($("#timeslider")[0]);

      if (clientVars)
      {
        $("#timeslider").show();

      }
    });
  })();

}

exports.init = init;
