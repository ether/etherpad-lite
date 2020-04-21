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

 // These parameters were global, now they are injected. A reference to the
 // Timeslider controller would probably be more appropriate.
var _ = require('./underscore');
var padmodals = require('./pad_modals').padmodals;

function loadBroadcastSliderJS(fireWhenAllScriptsAreLoaded)
{
  var BroadcastSlider;

  // Hack to ensure timeslider i18n values are in
  $("[data-key='timeslider_returnToPad'] > a > span").html(html10n.get("timeslider.toolbar.returnbutton"));

  (function()
  { // wrap this code in its own namespace
    var sliderLength = 1000;
    var sliderPos = 0;
    var sliderActive = false;
    var slidercallbacks = [];
    var savedRevisions = [];
    var sliderPlaying = false;

    var _callSliderCallbacks = function(newval)
      {
        sliderPos = newval;
        for (var i = 0; i < slidercallbacks.length; i++)
        {
          slidercallbacks[i](newval);
        }
      }

    var updateSliderElements = function()
      {
        for (var i = 0; i < savedRevisions.length; i++)
        {
          var position = parseInt(savedRevisions[i].attr('pos'));
          savedRevisions[i].css('left', (position * ($("#ui-slider-bar").width() - 2) / (sliderLength * 1.0)) - 1);
        }
        $("#ui-slider-handle").css('left', sliderPos * ($("#ui-slider-bar").width() - 2) / (sliderLength * 1.0));
      }

    var addSavedRevision = function(position, info)
      {
        var newSavedRevision = $('<div></div>');
        newSavedRevision.addClass("star");

        newSavedRevision.attr('pos', position);
        newSavedRevision.css('left', (position * ($("#ui-slider-bar").width() - 2) / (sliderLength * 1.0)) - 1);
        $("#ui-slider-bar").append(newSavedRevision);
        newSavedRevision.mouseup(function(evt)
        {
          BroadcastSlider.setSliderPosition(position);
        });
        savedRevisions.push(newSavedRevision);
      };

    var removeSavedRevision = function(position)
      {
        var element = $("div.star [pos=" + position + "]");
        savedRevisions.remove(element);
        element.remove();
        return element;
      };

    /* Begin small 'API' */

    function onSlider(callback)
    {
      slidercallbacks.push(callback);
    }

    function getSliderPosition()
    {
      return sliderPos;
    }

    function setSliderPosition(newpos)
    {
      newpos = Number(newpos);
      if (newpos < 0 || newpos > sliderLength) return;
      if(!newpos){
        newpos = 0; // stops it from displaying NaN if newpos isn't set
      }
      window.location.hash = "#" + newpos;
      $("#ui-slider-handle").css('left', newpos * ($("#ui-slider-bar").width() - 2) / (sliderLength * 1.0));
      $("a.tlink").map(function()
      {
        $(this).attr('href', $(this).attr('thref').replace("%revision%", newpos));
      });

      $("#revision_label").html(html10n.get("timeslider.version", { "version": newpos}));

      $("#leftstar, #leftstep").toggleClass('disabled', newpos == 0);
      $("#rightstar, #rightstep").toggleClass('disabled', newpos == sliderLength);

      sliderPos = newpos;
      _callSliderCallbacks(newpos);
    }

    function getSliderLength()
    {
      return sliderLength;
    }

    function setSliderLength(newlength)
    {
      sliderLength = newlength;
      updateSliderElements();
    }

    // just take over the whole slider screen with a reconnect message

    function showReconnectUI()
    {
      padmodals.showModal("disconnected");
    }

    function setAuthors(authors)
    {
      var authorsList = $("#authorsList");
      authorsList.empty();
      var numAnonymous = 0;
      var numNamed = 0;
      var colorsAnonymous = [];
      _.each(authors, function(author)
      {
        if(author)
        {
          var authorColor = clientVars.colorPalette[author.colorId] || author.colorId;
          if (author.name)
          {
            if (numNamed !== 0) authorsList.append(', ');

            $('<span />')
              .text(author.name || "unnamed")
              .css('background-color', authorColor)
              .addClass('author')
              .appendTo(authorsList);

            numNamed++;
          }
          else
          {
            numAnonymous++;
            if(authorColor) colorsAnonymous.push(authorColor);
          }
        }
      });
      if (numAnonymous > 0)
      {
        var anonymousAuthorString = html10n.get("timeslider.unnamedauthors", { num: numAnonymous });

        if (numNamed !== 0){
          authorsList.append(' + ' + anonymousAuthorString);
        } else {
          authorsList.append(anonymousAuthorString);
        }

        if(colorsAnonymous.length > 0){
          authorsList.append(' (');
          _.each(colorsAnonymous, function(color, i){
            if( i > 0 ) authorsList.append(' ');
            $('<span>&nbsp;</span>')
              .css('background-color', color)
              .addClass('author author-anonymous')
              .appendTo(authorsList);
          });
          authorsList.append(')');
        }

      }
      if (authors.length == 0)
      {
        authorsList.append(html10n.get("timeslider.toolbar.authorsList"));
      }
    }

    BroadcastSlider = {
      onSlider: onSlider,
      getSliderPosition: getSliderPosition,
      setSliderPosition: setSliderPosition,
      getSliderLength: getSliderLength,
      setSliderLength: setSliderLength,
      isSliderActive: function()
      {
        return sliderActive;
      },
      playpause: playpause,
      addSavedRevision: addSavedRevision,
      showReconnectUI: showReconnectUI,
      setAuthors: setAuthors
    }

    function playButtonUpdater()
    {
      if (sliderPlaying)
      {
        if (getSliderPosition() + 1 > sliderLength)
        {
          $("#playpause_button_icon").toggleClass('pause');
          sliderPlaying = false;
          return;
        }
        setSliderPosition(getSliderPosition() + 1);

        setTimeout(playButtonUpdater, 100);
      }
    }

    function playpause()
    {
      $("#playpause_button_icon").toggleClass('pause');

      if (!sliderPlaying)
      {
        if (getSliderPosition() == sliderLength) setSliderPosition(0);
        sliderPlaying = true;
        playButtonUpdater();
      }
      else
      {
        sliderPlaying = false;
      }
    }

    // assign event handlers to html UI elements after page load
    fireWhenAllScriptsAreLoaded.push(function()
    {
      $(document).keyup(function(e)
      {
        if (!e) var e = window.event;
        var code = e.keyCode || e.which;

        if (code == 37)
        { // left
          if (e.shiftKey) {
            $('#leftstar').click();
          } else {
            $('#leftstep').click();
          }
        }
        else if (code == 39)
        { // right
          if (e.shiftKey) {
            $('#rightstar').click();
          } else {
            $('#rightstep').click();
          }
        }
        else if (code == 32)
        { // spacebar
          $("#playpause_button_icon").trigger('click');
        }
      });

      // Resize
      $(window).resize(function()
      {
        updateSliderElements();
      });

      // Slider click
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
      $("#playpause_button_icon").click(function(evt)
      {
        BroadcastSlider.playpause();
      });

      // next/prev saved revision and changeset
      $('.stepper').click(function(evt)
      {
        switch ($(this).attr("id")) {
          case "leftstep":
            setSliderPosition(getSliderPosition() - 1);
            break;
          case "rightstep":
            setSliderPosition(getSliderPosition() + 1);
            break;
          case "leftstar":
            var nextStar = 0; // default to first revision in document
            for (var i = 0; i < savedRevisions.length; i++)
            {
              var pos = parseInt(savedRevisions[i].attr('pos'));
              if (pos < getSliderPosition() && nextStar < pos) nextStar = pos;
            }
            setSliderPosition(nextStar);
            break;
          case "rightstar":
            var nextStar = sliderLength; // default to last revision in document
            for (var i = 0; i < savedRevisions.length; i++)
            {
              var pos = parseInt(savedRevisions[i].attr('pos'));
              if (pos > getSliderPosition() && nextStar > pos) nextStar = pos;
            }
            setSliderPosition(nextStar);
            break;
        }
      })

      if (clientVars)
      {
        $("#timeslider-wrapper").show();

        var startPos = clientVars.collab_client_vars.rev;
        if(window.location.hash.length > 1)
        {
          var hashRev = Number(window.location.hash.substr(1));
          if(!isNaN(hashRev))
          {
            // this is necessary because of the socket.io-event which loads the changesets
            setTimeout(function() { setSliderPosition(hashRev); }, 1);
          }
        }

        setSliderLength(clientVars.collab_client_vars.rev);
        setSliderPosition(clientVars.collab_client_vars.rev);

        _.each(clientVars.savedRevisions, function(revision)
        {
          addSavedRevision(revision.revNum, revision);
        })

      }
    });
  })();

  BroadcastSlider.onSlider(function(loc)
  {
    $("#viewlatest").html(loc == BroadcastSlider.getSliderLength() ? "Viewing latest content" : "View latest content");
  })

  return BroadcastSlider;
}

exports.loadBroadcastSliderJS = loadBroadcastSliderJS;
