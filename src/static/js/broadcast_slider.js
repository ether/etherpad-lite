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
      
      $(document).keyup(function(e)
      {
        var code = -1;
        if (!e) var e = window.event;
        if (e.keyCode) code = e.keyCode;
        else if (e.which) code = e.which;

        if (code == 37)
        { // left
          if (!e.shiftKey)
          {
            setSliderPosition(getSliderPosition() - 1);
          }
          else
          {
            var nextStar = 0; // default to first revision in document
            for (var i = 0; i < savedRevisions.length; i++)
            {
              var pos = parseInt(savedRevisions[i].attr('pos'));
              if (pos < getSliderPosition() && nextStar < pos) nextStar = pos;
            }
            setSliderPosition(nextStar);
          }
        }
        else if (code == 39)
        {
          if (!e.shiftKey)
          {
            setSliderPosition(getSliderPosition() + 1);
          }
          else
          {
            var nextStar = sliderLength; // default to last revision in document
            for (var i = 0; i < savedRevisions.length; i++)
            {
              var pos = parseInt(savedRevisions[i].attr('pos'));
              if (pos > getSliderPosition() && nextStar > pos) nextStar = pos;
            }
            setSliderPosition(nextStar);
          }
        }
        else if (code == 32) playpause();

      });
      
      $(window).resize(function()
      {
        updateSliderElements();
      });

      $("#ui-slider-bar").mousedown(function(evt)
      {
        $("#ui-slider-handle").css('left', (evt.clientX - $("#ui-slider-bar").offset().left));
        $("#ui-slider-handle").trigger(evt);
      });

      // Slider dragging
      $("#ui-slider-handle").mousedown(function(evt)
      {
        this.startLoc = evt.clientX;
        this.currentLoc = parseInt($(this).css('left'));
        var self = this;
        sliderActive = true;
        $(document).mousemove(function(evt2)
        {
          $(self).css('pointer', 'move')
          var newloc = self.currentLoc + (evt2.clientX - self.startLoc);
          if (newloc < 0) newloc = 0;
          if (newloc > ($("#ui-slider-bar").width() - 2)) newloc = ($("#ui-slider-bar").width() - 2);
          $("#revision_label").html(html10n.get("timeslider.version", { "version": Math.floor(newloc * sliderLength / ($("#ui-slider-bar").width() - 2))}));
          $(self).css('left', newloc);
          if (getSliderPosition() != Math.floor(newloc * sliderLength / ($("#ui-slider-bar").width() - 2))) _callSliderCallbacks(Math.floor(newloc * sliderLength / ($("#ui-slider-bar").width() - 2)))
        });
        $(document).mouseup(function(evt2)
        {
          $(document).unbind('mousemove');
          $(document).unbind('mouseup');
          sliderActive = false;
          var newloc = self.currentLoc + (evt2.clientX - self.startLoc);
          if (newloc < 0) newloc = 0;
          if (newloc > ($("#ui-slider-bar").width() - 2)) newloc = ($("#ui-slider-bar").width() - 2);
          $(self).css('left', newloc);
          // if(getSliderPosition() != Math.floor(newloc * sliderLength / ($("#ui-slider-bar").width()-2)))
          setSliderPosition(Math.floor(newloc * sliderLength / ($("#ui-slider-bar").width() - 2)))
          if(parseInt($(self).css('left')) < 2){
            $(self).css('left', '2px');
          }else{
            self.currentLoc = parseInt($(self).css('left'));
          }
        });
      })

      // play/pause toggling
      $("#playpause_button").mousedown(function(evt)
      {
        var self = this;

        // $(self).css('background-image', 'url(/static/img/crushed_button_depressed.png)');
        $(self).mouseup(function(evt2)
        {
          // $(self).css('background-image', 'url(/static/img/crushed_button_undepressed.png)');
          $(self).unbind('mouseup');
          BroadcastSlider.playpause();
        });
        $(document).mouseup(function(evt2)
        {
          // $(self).css('background-image', 'url(/static/img/crushed_button_undepressed.png)');
          $(document).unbind('mouseup');
        });
      });

      // next/prev saved revision and changeset
      $('.stepper').mousedown(function(evt)
      {
        var self = this;
        var origcss = $(self).css('background-position');
        if (!origcss)
        {
          origcss = $(self).css('background-position-x') + " " + $(self).css('background-position-y');
        }
        var origpos = parseInt(origcss.split(" ")[1]);
        var newpos = (origpos - 43);
        if (newpos < 0) newpos += 87;

        var newcss = (origcss.split(" ")[0] + " " + newpos + "px");
        if ($(self).css('opacity') != 1.0) newcss = origcss;

        $(self).css('background-position', newcss)

        $(self).mouseup(function(evt2)
        {
          $(self).css('background-position', origcss);
          $(self).unbind('mouseup');
          $(document).unbind('mouseup');
          if ($(self).attr("id") == ("leftstep"))
          {
            setSliderPosition(getSliderPosition() - 1);
          }
          else if ($(self).attr("id") == ("rightstep"))
          {
            setSliderPosition(getSliderPosition() + 1);
          }
          else if ($(self).attr("id") == ("leftstar"))
          {
            var nextStar = 0; // default to first revision in document
            for (var i = 0; i < savedRevisions.length; i++)
            {
              var pos = parseInt(savedRevisions[i].attr('pos'));
              if (pos < getSliderPosition() && nextStar < pos) nextStar = pos;
            }
            setSliderPosition(nextStar);
          }
          else if ($(self).attr("id") == ("rightstar"))
          {
            var nextStar = sliderLength; // default to last revision in document
            for (var i = 0; i < savedRevisions.length; i++)
            {
              var pos = parseInt(savedRevisions[i].attr('pos'));
              if (pos > getSliderPosition() && nextStar > pos) nextStar = pos;
            }
            setSliderPosition(nextStar);
          }
        });
        $(document).mouseup(function(evt2)
        {
          $(self).css('background-position', origcss);
          $(self).unbind('mouseup');
          $(document).unbind('mouseup');
        });
      })

      if (clientVars)
      {
        $("#timeslider").show();
      }

    });
  })();

}

exports.init = init;
