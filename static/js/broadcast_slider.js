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
function loadBroadcastSliderJS(fireWhenAllScriptsAreLoaded) {
  var BroadcastSlider;

  (function() { // wrap this code in its own namespace
    var sliderLength    = 1000,
        sliderPos       = 0,
        sliderActive    = false,
        slidercallbacks = [],
        savedRevisions  = [],
        sliderPlaying   = false;

    function disableSelection(element) {
      element.onselectstart = function() {
        return false;
      };
      element.unselectable        = "on";
      element.style.MozUserSelect = "none";
    }
    var _callSliderCallbacks = function(newval) {
      sliderPos = newval;
      for (var i=0, l=slidercallbacks.length; i < l; i++) {
        slidercallbacks[i](newval);
      }
    };
    var updateSliderElements = function() {
      for (var i=0, l=savedRevisions.length; i < l; i++) {
        var position = parseInt(savedRevisions[i].attr('pos'), 10);
        savedRevisions[i].css('left', (position * ($('#ui-slider-bar').width() - 2) / (sliderLength * 1.0)) - 1);
      }
      $('#ui-slider-handle').css('left', sliderPos * ($('#ui-slider-bar').width() - 2) / (sliderLength * 1.0));
    };
    var addSavedRevision = function(position, info) {
      var newSavedRevision = $('<div></div>');
      newSavedRevision
      .addClass('star')
      .attr('pos', position)
      .css('position', 'absolute')
      .css('left', (position * ($('#ui-slider-bar').width() - 2) / (sliderLength * 1.0)) - 1);
      $('#timeslider-slider').append(newSavedRevision);
      newSavedRevision.mouseup(function(evt) {
        BroadcastSlider.setSliderPosition(position);
      });
      savedRevisions.push(newSavedRevision);
    };

    var removeSavedRevision = function(position) {
      var element = $('.star [pos=' + position + ']');
      savedRevisions.remove(element);
      element.remove();
      return element;
    };

    /* Begin small 'API' */
    function onSlider(callback) {
      slidercallbacks.push(callback);
    }

    function getSliderPosition() {
      return sliderPos;
    }

    function setSliderPosition(newpos) {
      newpos = Number(newpos);
      if (newpos < 0 || newpos > sliderLength)
        return;
      $('#ui-slider-handle').css('left', newpos * ($('#ui-slider-bar').width() - 2) / (sliderLength * 1.0));
      $('.tlink').map(function() {
        $(this).attr('href', $(this).attr('thref').replace('%revision%', newpos));
      });
      $('#revision_label').html('Version ' + newpos);

      if (newpos == 0)
        $('#leftstar, #leftstep').addClass('inactive');
      else
        $('#leftstar, #leftstep').removeClass('inactive');

      if (newpos == sliderLength)
        $('#rightstar, #rightstep').addClass('inactive');
      else
        $('#rightstar, #rightstep').removeClass('inactive');

      sliderPos = newpos;
      _callSliderCallbacks(newpos);
    }

    function getSliderLength() {
      return sliderLength;
    }

    function setSliderLength(newlength) {
      sliderLength = newlength;
      updateSliderElements();
    }

    // take over the whole slider screen with a reconnect message
    function showReconnectUI() {
      $('#error').show();
    }

    function setAuthors(authors) {
      $('#authorstable').empty();
      var numAnonymous  = 0,
          numNamed      = 0,
          html;
      authors.forEach(function(author) {
        if (author.name) {
          numNamed++;
          var tr        = $('<tr></tr>'),
              swatchtd  = $('<td></td>'),
              swatch    = $('<div class="swatch"></div>'),
              nametd    = $('<td></td>');
          swatch.css('background-color', clientVars.colorPalette[author.colorId]);
          swatchtd.append(swatch);
          tr.append(swatchtd);
          nametd.text(author.name || 'unnamed');
          tr.append(nametd);
          $('#authorstable').append(tr);
        } else {
          numAnonymous++;
        }
      });
      if (numAnonymous > 0) {
        html =  '<tr><td colspan="2" style="color:#999; padding-left:10px">' +
                    (numNamed > 0 ? '...and ' : '') + numAnonymous + ' unnamed author' +
                    (numAnonymous > 1 ? 's' : '') + '</td></tr>';
        $('#authorstable').append($(html));
      }
      if (authors.length == 0) {
        html = '<tr><td colspan="2" style="color:#999; padding-left:10px">No Authors</td></tr>';
        $('#authorstable').append($(html));
      }
    }

    BroadcastSlider = {
      onSlider          : onSlider,
      getSliderPosition : getSliderPosition,
      setSliderPosition : setSliderPosition,
      getSliderLength   : getSliderLength,
      setSliderLength   : setSliderLength,
      isSliderActive    : function() {
        return sliderActive;
      },
      playpause         : playpause,
      addSavedRevision  : addSavedRevision,
      showReconnectUI   : showReconnectUI,
      setAuthors        : setAuthors
    };

    function playButtonUpdater() {
      if (sliderPlaying) {
        if (getSliderPosition() + 1 > sliderLength) {
          $('#playpause_button').toggleClass('pause');
          sliderPlaying = false;
          return;
        }
        setSliderPosition(getSliderPosition() + 1);
        setTimeout(playButtonUpdater, 100);
      }
    }

    function playpause() {
      $('#playpause_button').toggleClass('pause');
      if (!sliderPlaying) {
        if (getSliderPosition() == sliderLength) setSliderPosition(0);
        sliderPlaying = true;
        playButtonUpdater();
      } else {
        sliderPlaying = false;
      }
    }

    // assign event handlers to html UI elements after page load
    fireWhenAllScriptsAreLoaded.push(function() {
      disableSelection($("#playpause_button")[0]);
      disableSelection($("#timeslider")[0]);

      if (clientVars.sliderEnabled && clientVars.supportsSlider) {
        $(document).keyup(function(e) {
          var code = -1,
              i, l, nextStar, pos;
          if (!e)
            var e = window.event;
          code = (e.keyCode) ? e.keyCode : e.which;

          switch (code) {
            case 37:    // left
              if (!e.shiftKey) {
                setSliderPosition(getSliderPosition() - 1);
              } else {
                nextStar = 0; // default to first revision in document
                for (i=0, l=savedRevisions.length; i < l; i++) {
                  pos = parseInt(savedRevisions[i].attr('pos'), 10);
                  if (pos < getSliderPosition() && nextStar < pos)
                    nextStar = pos;
                }
                setSliderPosition(nextStar);
              }
              break;
            case 39:
              if (!e.shiftKey) {
                setSliderPosition(getSliderPosition() + 1);
              } else {
                nextStar = sliderLength; // default to last revision in document
                for (i=0, l=savedRevisions.length; i < l; i++) {
                  pos = parseInt(savedRevisions[i].attr('pos'), 10);
                  if (pos > getSliderPosition() && nextStar > pos)
                    nextStar = pos;
                }
                setSliderPosition(nextStar);
              }
              break;
            case 32:
              playpause();
              break;
          }
        });
      }

      $(window).resize(function() {
        updateSliderElements();
      });

      $('#ui-slider-bar')
      .mousedown(function(evt) {
        setSliderPosition(Math.floor((evt.clientX - $('#ui-slider-bar').offset().left) * sliderLength / 742));
        $('#ui-slider-handle')
        .css('left', (evt.clientX - $('#ui-slider-bar').offset().left))
        .trigger(evt);
      });

      // Slider dragging
      $('#ui-slider-handle')
      .mousedown(function(evt) {
        this.startLoc   = evt.clientX;
        this.currentLoc = parseInt($(this).css('left'), 10);
        var self = this;
        sliderActive = true;
        $(document).mousemove(function(evt2) {
          var newloc        = self.currentLoc + (evt2.clientX - self.startLoc),
              adjustedWidth = $('#ui-slider-bar').width() - 2,
              pos;
          if (newloc < 0)
            newloc = 0;
          if (newloc > adjustedWidth)
            newloc = adjustedWidth;
          $('#revision_label').html('Version ' + Math.floor(newloc * sliderLength / adjustedWidth));
          $(self).css('left', newloc);
          pos = Math.floor(newloc * sliderLength / adjustedWidth);
          if (getSliderPosition() != pos)
            _callSliderCallbacks(pos);
        });
        $(document).mouseup(function(evt2) {
          $(document)
          .unbind('mousemove')
          .unbind('mouseup');
          sliderActive = false;
          var newloc = self.currentLoc + (evt2.clientX - self.startLoc);
          if (newloc < 0)
            newloc = 0;
          if (newloc > ($("#ui-slider-bar").width() - 2))
            newloc = ($("#ui-slider-bar").width() - 2);
          $(self).css('left', newloc);
          setSliderPosition(Math.floor(newloc * sliderLength / ($("#ui-slider-bar").width() - 2)));
          self.currentLoc = parseInt($(self).css('left'), 10);
        });
      });

      // play/pause toggling
      $('#playpause_button').mousedown(function(evt) {
        var self = this;
        $(self)
        .addClass('pressed')
        .mouseup(function(evt2) {
          $(self).removeClass('pressed');
          $(self).unbind('mouseup');
          BroadcastSlider.playpause();
        });
        $(document).mouseup(function(evt2) {
          $(self).removeClass('pressed');
          $(document).unbind('mouseup');
        });
      });

      // next / prev saved revision and changeset
      $('#steppers A').mousedown(function(evt) {
        var self = this;
        $(self)
        .addClass('clicked')
        .mouseup(function(evt2) {
          $(self)
          .removeClass('clicked')
          .unbind('mouseup');
          $(document).unbind('mouseup');
          var id = $(self).attr('id'),
              i, l, nextStar, pos;
          switch (id) {
            case 'leftstep':
              setSliderPosition(getSliderPosition() - 1);
              break;
            case 'rightstep':
              setSliderPosition(getSliderPosition() + 1);
              break;
            case 'leftstar':
              nextStar = 0;             // default to first revision in document
              for (i=0, l=savedRevisions.length; i < l; i++) {
                pos = parseInt(savedRevisions[i].attr('pos'), 10);
                if (pos < getSliderPosition() && nextStar < pos)
                  nextStar = pos;
              }
              setSliderPosition(nextStar);
              break;
            case 'rightstar':
              nextStar = sliderLength;  // default to last revision in document
              for (i=0, l=savedRevisions.length; i < l; i++) {
                pos = parseInt(savedRevisions[i].attr('pos'), 10);
                if (pos > getSliderPosition() && nextStar > pos)
                  nextStar = pos;
              }
              setSliderPosition(nextStar);
              break;
          }
        });
        $(document).mouseup(function(evt2) {
          $(self)
          .removeClass('clicked')
          .unbind('mouseup');
          $(document).unbind('mouseup');
        });
      });

      if (clientVars) {
        if (clientVars.fullWidth)
          $('#padpage').addClass('full-width');
        if (clientVars.disableRightBar) {
          $('#rightbars').css('display', 'none');
          $('#padmain').css('width', 'auto');
          if (clientVars.fullWidth)
            $('#padmain').css({right: 7});
          else
            $('#padmain').css('width', '860px');
          $('#revision').css({
            position: 'absolute',
            right   : 20,
            top     : 20
          });
        }
        if (clientVars.sliderEnabled) {
          if (clientVars.supportsSlider) {
            setSliderLength(clientVars.totalRevs);
            setSliderPosition(clientVars.revNum);
            clientVars.savedRevisions.forEach(function(revision) {
              addSavedRevision(revision.revNum, revision);
            });
          } else {
            // slider is not supported
            $('#error').html('The timeslider feature is not supported on this pad. <a href="/ep/about/faq#disabledslider">Why not?</a>').show();
          }
        } else {
          if (clientVars.supportsSlider) {
            setSliderLength(clientVars.totalRevs);
            setSliderPosition(clientVars.revNum);
          }
        }
      }
    });
  })();

  BroadcastSlider.onSlider(function(loc) {
    $('#viewlatest').html(loc == BroadcastSlider.getSliderLength() ? 'Viewing latest content' : 'View latest content');
  });

  return BroadcastSlider;
}

exports.loadBroadcastSliderJS = loadBroadcastSliderJS;
