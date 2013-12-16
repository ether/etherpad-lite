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
  },
  {//instance
    init: function (connection, root_element) {
      this.connection = connection;
      this.revision_number = this.connection.getCurrentRevision().revnum;
      // if there was a revision specified in the 'location.hash', jump to it.
      if (window.location.hash.length > 1) {
        var rev = Number(window.location.hash.substr(1));
        if(!isNaN(rev))
          this.revision_number = rev;
      }

      console.log("New RevisionSlider, head_revision = %d", this.revision_number);
      // parse the various elements we need:
      this.elements = {};
      this.loadElements(root_element);
      var _this = this;
      this.slider = new SliderUI(this.elements.slider_bar,
                  options = {
                    value: this.revision_number,
                    max: this.connection.head_revision,
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
    goToRevision: function (revnum) {
      //TODO: this should actually do an async jump to revision (with all the server fetching
      //and changeset rendering that that implies), and perform the setPosition in a callback.
      //TODO: we need some kind of callback for setting revision metadata.
      //TODO: at some point we need to set window.location.hash
      if (revnum > this.connection.head_revision)
        revnum = this.connection.latest_revision;
      if (revnum < 0)
        revnum = 0;
      console.log("GO TO REVISION", revnum);

      var _this = this;
      this.connection.goToRevision(revnum, function (revision, timestamp) {
        console.log("[revisionslider > goToRevision > callback]", revision, timestamp);
        //update UI elements:
        var revnum = revision.revnum;
        _this.elements.revision_label.html(html10n.get("timeslider.version", { "version": revnum }));
        _this.slider.setValue(revnum);
        _this.revision_number = revnum;
        window.location.hash = "#" + revnum;
        _this.setTimestamp(timestamp);
        //TODO: set the enabled/disabled for button-left and button-right
      });
    },
    setTimestamp: function (timestamp) {
      var zeropad = function (str, length) {
        str = str + "";
        while (str.length < length)
          str = '0' + str;
        return str;
      }
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
        console.log("was :",  _this.revision_number);
        _this.goToRevision(_this.revision_number - 1);
      });

      this.elements.button_right.on("click", function (event) {
        _this.goToRevision(_this.revision_number + 1);
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
