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
require("./jquery.class");

/**
 * A class for anything which can be hung off of the slider bar.
 * I.e. this is for the handle, or saved-revisions (stars).
 * TODO:
 *  - handle mousedowns/clicks
 *  - handle drags
 */
$.Class("SliderHandleUI",
  {//statics
  },
  {//instance
    /**
     * Construct the SliderHandle.
     * @param {SliderUI} slider The slider from which this handle will be hung.
     * @param {Number} position The initial position for this handle.
     */
    init: function (slider, value, type) {
      console.log("New SliderHandle(%d, %s)", value, type);
      this.slider = slider;
      this.value = value;
      //create the element:
      this.element = $("<div class='ui-slider-handle'></div>");
      if (type === "")
        type = "handle";
      this.element.addClass("ui-slider-handle-" + type);
      this._mouseInit();
    },
    _mouseInit: function () {
      this.element.on("mousedown.sliderhandle", null, this, function(event) {
        console.log("sliderhandleui - mousedown")
      })
    },
  }
);

SliderHandleUI("SliderSavedRevisionUI",
  {//statics
  },
  {//instance
    init: function(slider, revision) {
      this._super(slider, revision.revNum, 'star');
      this.revision = revision;
    },
    _mouseInit: function () {
      this.element.on("mousedown.sliderhandle", null, this, function(event) {
        console.log("SliderSavedRevisionUI - mousedown")
      })
    },
  }
);

//TODO:
//  - window resizing is currently broken!
//  - keyboard events
$.Class("SliderUI",
  {//statics
    defaults: {
      min: 0,
      max: 100,
    }
  },
  {//instance
    init: function (element, options) {
      this.options = $.extend({}, this.defaults, options);
      this.element = element;
      this.current_value = "value" in this.options ? this.options.value : 0;
      this.handles = [];
      this.attachHandle(new SliderHandleUI(this, this._current_value, 'handle'));
      this._mouseInit();

      // handle window resize
      var _this = this;
      $(window).resize(function() {
        _this.render();
      });
    },
    _getStep: function () {
      return (this.element.width()) / (this.options.max * 1.0);
    },
    render: function () {
      for(var h in this.handles) {
        handle = this.handles[h];
        handle.element.css('left', (handle.value * this._getStep()) );
      }
    },
    // this internal version of _setValue should only be used to render
    // when the handle changes position as a result of UI events handled
    // by this slider.
    _setValue: function (value) {
      if (value < 0)
        value = 0;
      if (value > this.options.max)
        value = this.options.max;
      this.handles[0].value = value;
      this.current_value = value;
      this.render();
    },
    // this 'public' version of _setValue also triggers a change event
    setValue: function(value) {
      this._setValue(value);
      this._trigger("change", value);
    },
    setMax: function (max) {
      this.options.max = max;
      this.render();
    },
    attachHandle: function (handle) {
      this.handles.push(handle);
      this.element.append(handle.element);
      this.current_value = this.handles[0].value;
      return handle;
    },
    _trigger: function (eventname, value) {
      //TODO: implement trigger
      console.log("triggering event: ", eventname);
      if (eventname in this.options) {
        this.options[eventname](value);
      }
    },
    _mouseInit: function () {
      // handle all mouse events for the slider and handles right here
      var _this = this;
      this.element.on("mousedown.slider", function (event) {
        if (event.target == _this.element[0] || $(event.target).hasClass("ui-slider-handle")) {
          // the click is on the slider bar itself.
          var start_value = Math.floor((event.clientX-_this.element.offset().left) / _this._getStep());
          console.log("sliderbar mousedown, value:", start_value);
          if (_this.current_value != start_value)
            _this._setValue(start_value);

          $(document).on("mousemove.slider", function (event) {
             var current_value = Math.floor((event.clientX-_this.element.offset().left) / _this._getStep());
             console.log("sliderbar mousemove, value:", current_value);
             // don't change the value if it hasn't actually changed!
             if (_this.current_value != current_value) {
               _this._setValue(current_value);
               _this._trigger("slide", current_value);
             }
          });

          $(document).on("mouseup.slider", function (event) {
            // make sure to get rid of the handlers on document,
            // we don't need them after this 'slide' session is done.
            $(document).off("mouseup.slider mousemove.slider");
             var end_value = Math.floor((event.clientX-_this.element.offset().left) / _this._getStep());
             console.log("sliderbar mouseup, value:", end_value);
             // always change the value at mouseup
            _this._setValue(end_value);
            _this._trigger("change", end_value);

          });
        } else {
          console.log("We shouldn't be here!")
          console.log(event.target);
        }
      })
    },
  }
);

$.Class("RevisionSlider",
  {//statics
  },
  {//instance
    init: function (timeslider, root_element) {
      this.timeslider = timeslider;
      this.revision_number = this.timeslider.head_revision;
      console.log("New RevisionSlider, head_revision = %d", this.revision_number);
      // parse the various elements we need:
      this.elements = {};
      this.loadElements(root_element);
      var _this = this;
      this.slider = new SliderUI(this.elements['slider-bar'],
                  options = {
                    max: this.timeslider.head_revision,
                    change: function () { _this.onChange.apply(_this, arguments); },
                    slide: function () { _this.onSlide.apply(_this, arguments); },
                  });
      this.loadSavedRevisionHandles();

      this._mouseInit();
    },
    onChange: function (value) {
      console.log("in change handler:", value);
    },
    onSlide: function (value) {
      console.log("in slide handler:", value);
    },
    loadElements: function (root_element) {
      this.elements['root'] = root_element;
      //this.elements['slider-handle'] = root_element.first("#ui-slider-handle");
      this.elements['slider-bar'] = root_element.find("#ui-slider-bar");
      this.elements['slider'] = root_element.find("#timeslider-slider");
      this.elements['button-left'] = root_element.find("#leftstep");
      this.elements['button-right'] = root_element.find("#rightstep");
      this.elements['button-play'] = root_element.find("#playpause_button");
      this.elements['timestamp'] = root_element.find("#timer");
      this.elements['revision-label'] = root_element.find("#revision_label");
      this.elements['revision-date'] = root_element.find("#revision_date");
      this.elements['authors'] = root_element.first("#authorsList");
    },
    loadSavedRevisionHandles: function () {
      for (var r in this.timeslider.savedRevisions) {
        var rev = this.timeslider.savedRevisions[r];
        this.slider.attachHandle(new SliderSavedRevisionUI(this, rev));
      };
    },
    goToRevision: function (revNum) {
      //TODO: this should actually do an async jump to revision (with all the server fetching
      //and changeset rendering that that implies), and perform the setPosition in a callback.
      //TODO: we need some kind of callback for setting revision metadata.
      //TODO: at some point we need to set window.location.hash
      if (revNum > this.timeslider.head_revision)
        revNum = this.timeslider.latest_revision;
      if (revNum < 0)
        revNum = 0;
      console.log("GO TO REVISION", revNum)
      this.elements["revision-label"].html(html10n.get("timeslider.version", { "version": revNum }));
      this.slider.setValue(revNum);
      this.revision_number = revNum;
      //TODO: set the enabled/disabled for button-left and button-right
    },
    _mouseInit: function () {
      var _this = this;
      this.elements["button-left"].on("click", function (event) {
        console.log("was :",  _this.revision_number);
        _this.goToRevision(_this.revision_number - 1);
      });

      this.elements["button-right"].on("click", function (event) {
        _this.goToRevision(_this.revision_number + 1);
      });

    }

  }
);

function loadBroadcastSliderJS(tsclient, fireWhenAllScriptsAreLoaded)
{
  var BroadcastSlider;

  (function()
  { // wrap this code in its own namespace

    tsui = new RevisionSlider(tsclient, $("#timeslider-top"));

    // if there was a revision specified in the 'location.hash', jump to it.
    if (window.location.hash.length > 1) {
      var rev = Number(window.location.hash.substr(1));
      if(!isNaN(rev))
        tsui.goToRevision(rev);
    }


    var sliderLength = 1000;
    var sliderPos = 0;
    var sliderActive = false;
    var slidercallbacks = [];
    var savedRevisions = [];
    var sliderPlaying = false;
    clientVars = tsclient.clientVars;

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
    var _callSliderCallbacks = function(newval)
      {
        sliderPos = newval;
        for (var i = 0; i < slidercallbacks.length; i++)
        {
          slidercallbacks[i](newval);
        }
      }
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

      if (newpos == 0)
      {
        $("#leftstar").css('opacity', .5);
        $("#leftstep").css('opacity', .5);
      }
      else
      {
        $("#leftstar").css('opacity', 1);
        $("#leftstep").css('opacity', 1);
      }

      if (newpos == sliderLength)
      {
        $("#rightstar").css('opacity', .5);
        $("#rightstep").css('opacity', .5);
      }
      else
      {
        $("#rightstar").css('opacity', 1);
        $("#rightstep").css('opacity', 1);
      }

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

    //TODO: figure out what the hell this is for
    var fixPadHeight = _.throttle(function(){
      var height = $('#timeslider-top').height();
      $('#editorcontainerbox').css({marginTop: height});
    }, 600);

    function setAuthors(authors)
    {
      var authorsList = $("#authorsList");
      authorsList.empty();
      var numAnonymous = 0;
      var numNamed = 0;
      var colorsAnonymous = [];
      _.each(authors, function(author)
      {
        var authorColor =  clientVars.colorPalette[author.colorId] || author.colorId;
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

      fixPadHeight();
    }

    //This API is in use by broadcast.js
    //TODO: refactor broadcast.js to use RevisionSlider instead
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


      // play/pause toggling
      $("XXXX#playpause_button").mousedown(function(evt)
      {
        var self = this;

        $(self).css('background-image', 'url(/static/img/crushed_button_depressed.png)');
        $(self).mouseup(function(evt2)
        {
          $(self).css('background-image', 'url(/static/img/crushed_button_undepressed.png)');
          $(self).unbind('mouseup');
          BroadcastSlider.playpause();
        });
        $(document).mouseup(function(evt2)
        {
          $(self).css('background-image', 'url(/static/img/crushed_button_undepressed.png)');
          $(document).unbind('mouseup');
        });
      });

      // next/prev saved revision and changeset
      $('XXX.stepper').mousedown(function(evt)
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

  BroadcastSlider.onSlider(function(loc)
  {
    $("#viewlatest").html(loc == BroadcastSlider.getSliderLength() ? "Viewing latest content" : "View latest content");
  })

  return BroadcastSlider;
}

exports.loadBroadcastSliderJS = loadBroadcastSliderJS;
