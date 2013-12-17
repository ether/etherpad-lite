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
var sliderui = require('./sliderui');
require('./jquery.class');

$.Class("RevisionSlider",
  {//statics
    PLAYBACK_DELAY: 400,
  },
  {//instance
    init: function (connection, root_element) {
      this.connection = connection;
      this.revision_number = this.connection.getCurrentRevision().revnum;
      this.timestamp = 0;
      this.is_playing = false;
      // if there was a revision specified in the 'location.hash', jump to it.
      if (window.location.hash.length > 1) {
        var rev = Number(window.location.hash.substr(1));
        if(!isNaN(rev))
          this.revision_number = rev;
      }

      console.log("New RevisionSlider, current_revision = %d", this.revision_number);
      // parse the various elements we need:
      this.elements = {};
      this.loadElements(root_element);
      var _this = this;
      this.slider = new SliderUI(this.elements.slider_bar,
                  options = {
                    value: this.revision_number,
                    max: this.connection.getHeadRevision(),
                    change: function () { _this.onChange.apply(_this, arguments); },
                    slide: function () { _this.onSlide.apply(_this, arguments); },
                  });
      this.loadSavedRevisionHandles();
      this.slider.render();

      this._mouseInit();

      this.goToRevision(this.revision_number);
    },
    onChange: function (value) {
      console.log("in change handler:", value);
      this.goToRevision(value);
    },
    onSlide: function (value) {
      console.log("in slide handler:", value);
      this.goToRevision(value);
    },
    loadElements: function (root_element) {
      this.elements.root = root_element;
      //this.elements['slider-handle'] = root_element.first("#ui-slider-handle");
      this.elements.slider_bar = root_element.find("#ui-slider-bar");
      this.elements.slider = root_element.find("#timeslider-slider");
      this.elements.button_left = root_element.find("#leftstep");
      this.elements.button_right = root_element.find("#rightstep");
      this.elements.button_play = root_element.find("#playpause_button");
      this.elements.timestamp = root_element.find("#timer");
      this.elements.revision_label = root_element.find("#revision_label");
      this.elements.revision_date = root_element.find("#revision_date");
      this.elements.authors = root_element.first("#authorsList");
    },
    loadSavedRevisionHandles: function () {
      for (var r in this.connection.savedRevisions) {
        var rev = this.connection.savedRevisions[r];
        this.slider.createHandle(rev.revNum, "star");
      }
    },
    playpause: function () {
      if (this.is_playing) {
        this.is_playing = false;
        return;
      }

      var revnum = this.revision_number;
      if (revnum == this.connection.getHeadRevision())
        revnum = 0;

      var _this = this;
      var keepPlaying = function (current_revnum) {
        if (current_revnum == _this.connection.getHeadRevision())
          _this.is_playing = false;
        if (!_this.is_playing)
          return;
        setTimeout(function () {
          _this.goToRevision(current_revnum + 1, keepPlaying);
        }, RevisionSlider.PLAYBACK_DELAY);
      };

      this.is_playing = true;
      this.goToRevision(revnum, keepPlaying);
    },
    /**
     * Update the UI elements to the current revision
     */
    render: function () {
      this.elements.revision_label.html(html10n.get("timeslider.version", { "version": this.revision_number }));
      this.slider.setValue(this.revision_number);
      window.location.hash = "#" + this.revision_number;
      this.setTimestamp(this.timestamp);
      if (this.is_playing)
        this.elements.button_play.find("div").addClass("pause");
      else
        this.elements.button_play.find("div").removeClass("pause");
      if (this.revision_number == this.connection.getHeadRevision())
        this.elements.button_right.addClass("disabled");
      else
        this.elements.button_right.removeClass("disabled");
      if (this.revision_number === 0)
        this.elements.button_left.addClass("disabled");
      else
        this.elements.button_left.removeClass("disabled");
    },
    /**
     * Go to a specific revision number. This will perform the actual
     * transition to the revision and set the UI elements as required
     * once the transition is done. The callback can be used to perform
     * actions after the transition is complete and the UI has been
     * updated.
     * @param {number} revnum - The revision to transition to.
     * @param {callback} atRevision_callback - The callback.
     */
    goToRevision: function (revnum, atRevision_callback) {
      if (revnum > this.connection.getHeadRevision())
        revnum = this.connection.latest_revision;
      if (revnum < 0)
        revnum = 0;

      var _this = this;
      this.connection.goToRevision(revnum, function (revision, timestamp) {
        console.log("[revisionslider > goToRevision > callback]", revision, timestamp);
        //update UI elements:
        _this.revision_number = revision.revnum;
        _this.timestamp = timestamp;
        _this.render.call(_this);
        //TODO: set the enabled/disabled for button-left and button-right
        if (atRevision_callback)
          atRevision_callback(revnum);
      });
    },
    /**
     * Set the timestamp and revision date displays
     * @param {number} timestamp - The timestamp of the current revision.
     */
    setTimestamp: function (timestamp) {
      var zeropad = function (str, length) {
        str = str + "";
        while (str.length < length)
          str = '0' + str;
        return str;
      };
      var months = [
                    html10n.get("timeslider.month.january"),
                    html10n.get("timeslider.month.february"),
                    html10n.get("timeslider.month.march"),
                    html10n.get("timeslider.month.april"),
                    html10n.get("timeslider.month.may"),
                    html10n.get("timeslider.month.june"),
                    html10n.get("timeslider.month.july"),
                    html10n.get("timeslider.month.august"),
                    html10n.get("timeslider.month.september"),
                    html10n.get("timeslider.month.october"),
                    html10n.get("timeslider.month.november"),
                    html10n.get("timeslider.month.december")
      ];
      var date = new Date(timestamp);
      var timestamp_format = html10n.get("timeslider.dateformat",
                         {
                          "day": zeropad(date.getDate(), 2),
                          "month": zeropad(date.getMonth() + 1, 2),
                          "year": date.getFullYear(),
                          "hours": zeropad(date.getHours(), 2),
                          "minutes": zeropad(date.getMinutes(), 2),
                          "seconds": zeropad(date.getSeconds(), 2),
                         });
      this.elements.timestamp.html(timestamp_format);

      var revisionDate = html10n.get("timeslider.saved", {
                                      "day": date.getDate(),
                                      "month": months[date.getMonth()],
                                      "year": date.getFullYear()
      });

      this.elements.revision_date.html(revisionDate);
    },
    _mouseInit: function () {
      var _this = this;
      this.elements.button_left.on("click", function (event) {
        if ($(this).hasClass("disabled"))
          return;
        _this.is_playing = false;
        _this.goToRevision(_this.revision_number - 1);
      });

      this.elements.button_right.on("click", function (event) {
        if ($(this).hasClass("disabled"))
          return;
        _this.is_playing = false;
        _this.goToRevision(_this.revision_number + 1);
      });

      this.elements.button_play.on("click", function (event) {
        _this.playpause();
      });
    }

  }
);

function init(connection, fireWhenAllScriptsAreLoaded)
{
  var BroadcastSlider;

  (function()
  { // wrap this code in its own namespace

    tsui = new RevisionSlider(connection, $("#timeslider-top"));


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
      if (authors.length === 0)
      {
        authorsList.append(html10n.get("timeslider.toolbar.authorsList"));
      }

      fixPadHeight();
    }

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
