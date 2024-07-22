'use strict';
/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

import {UserInfo} from "./types/SocketIOMessage";

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
import _ from 'underscore';
import {padModals as padmodals} from "./pad_modals";
import colorutils from "./colorutils";
import html10n from './vendors/html10n';
import {PadRevision} from "./types/PadRevision";

class BroadcastSlider {
  private sliderLength = 1000;
  private sliderPos = 0;
  private sliderActive = false;
  private slidercallbacks: ((val: number)=>void)[] = [];
  private savedRevisions: JQuery<HTMLElement>[] = [];
  private sliderPlaying = false;
  private fireWhenAllScriptsAreLoaded: Function[] = [];
  private startLoc?: number;
  private currentLoc?: number;

  constructor() {
    // Hack to ensure timeslider i18n values are in
    $("[data-key='timeslider_returnToPad'] > a > span").html(
      html10n.get('timeslider.toolbar.returnbutton'))
    // assign event handlers to html UI elements after page load
    this.fireWhenAllScriptsAreLoaded.push(() => {
      $(document).on('keyup', (e) => {
        if (!e) { // @ts-ignore
          e = window.event;
        }
        const code = e.keyCode || e.which;

        if (code === 37) { // left
          if (e.shiftKey) {
            $('#leftstar').trigger('click');
          } else {
            $('#leftstep').trigger('click');
          }
        } else if (code === 39) { // right
          if (e.shiftKey) {
            $('#rightstar').trigger('click');
          } else {
            $('#rightstep').trigger('click');
          }
        } else if (code === 32) { // spacebar
          $('#playpause_button_icon').trigger('click');
        }
      });

      // Resize
      $(window).on('resize', () => {
        this.updateSliderElements();
      });

      // Slider click
      $('#ui-slider-bar').on('mousedown', (evt) => {
        $('#ui-slider-handle').css('left', (evt.clientX - $('#ui-slider-bar').offset()!.left));
        $('#ui-slider-handle').trigger(evt);
      });

      // Slider dragging
      $('#ui-slider-handle').on('mousedown',  (evt)=> {
        this.startLoc = evt.clientX;
        this.currentLoc = parseInt($(this).css('left'));
        this.sliderActive = true;
        $(document).on('mousemove', (evt2) => {
          $(this).css('pointer', 'move');
          let newloc = this.currentLoc! + (evt2.clientX - this.startLoc!);
          if (newloc < 0) newloc = 0;
          const maxPos = $('#ui-slider-bar').width()! - 2;
          if (newloc > maxPos) newloc = maxPos;
          const version = Math.floor(newloc * this.sliderLength / maxPos);
          $('#revision_label').html(html10n.get('timeslider.version', {version}));
          $(this).css('left', newloc);
          if (this.getSliderPosition() !== version) this.callSliderCallbacks(version);
        });
        $(document).on('mouseup', (evt2) => {
          $(document).off('mousemove');
          $(document).off('mouseup');
          this.sliderActive = false;
          let newloc = this.currentLoc! + (evt2.clientX - this.startLoc!);
          if (newloc < 0) newloc = 0;
          const maxPos = $('#ui-slider-bar').width()! - 2;
          if (newloc > maxPos) newloc = maxPos;
          $(this).css('left', newloc);
          this.setSliderPosition(Math.floor(newloc * this.sliderLength / maxPos));
          if (parseInt($(this).css('left')) < 2) {
            $(this).css('left', '2px');
          } else {
            this.currentLoc = parseInt($(this).css('left'));
          }
        });
      });

      // play/pause toggling
      $('#playpause_button_icon').on('click', (evt) => {
        this.playpause();
      });

      // next/prev saved revision and changeset
      $('.stepper').on('click',  (evt)=> {
        switch ($(this).attr('id')) {
          case 'leftstep':
            this.setSliderPosition(this.getSliderPosition() - 1);
            break;
          case 'rightstep':
            this.setSliderPosition(this.getSliderPosition() + 1);
            break;
          case 'leftstar': {
            let nextStar = 0; // default to first revision in document
            for (let i = 0; i < this.savedRevisions.length; i++) {
              const pos = parseInt(this.savedRevisions[i].attr('pos') as string);
              if (pos < this.getSliderPosition() && nextStar < pos) nextStar = pos;
            }
            this.setSliderPosition(nextStar);
            break;
          }
          case 'rightstar': {
            let nextStar = this.sliderLength; // default to last revision in document
            for (let i = 0; i < this.savedRevisions.length; i++) {
              const pos = parseInt(this.savedRevisions[i].attr('pos') as string);
              if (pos > this.getSliderPosition() && nextStar > pos) nextStar = pos;
            }
            this.setSliderPosition(nextStar);
            break;
          }
        }
      });

      if (window.clientVars) {
        $('#timeslider-wrapper').show();

        if (window.location.hash.length > 1) {
          const hashRev = Number(window.location.hash.substr(1));
          if (!isNaN(hashRev)) {
            // this is necessary because of the socket.io-event which loads the changesets
            setTimeout(() => { this.setSliderPosition(hashRev); }, 1);
          }
        }

        this.setSliderLength(window.clientVars.collab_client_vars.rev);
        this.setSliderPosition(window.clientVars.collab_client_vars.rev);

        _.each(window.clientVars.savedRevisions, (revision: PadRevision) => {
          this.addSavedRevision(revision.revNum, revision);
        });
      }
    })
    this.onSlider((loc) => {
      $('#viewlatest').html(
        `${loc === this.getSliderLength() ? 'Viewing' : 'View'} latest content`);
    })
  }

  private callSliderCallbacks = (newval: number) => {
    this.sliderPos = newval;
    for (let i = 0; i < this.slidercallbacks.length; i++) {
      this.slidercallbacks[i](newval);
    }
  }

  updateSliderElements = () => {
    for (let i = 0; i < this.savedRevisions.length; i++) {
      const position = parseInt(this.savedRevisions[i].attr('pos')!);
      this.savedRevisions[i].css(
        'left', (position * ($('#ui-slider-bar').width()! - 2) / (this.sliderLength * 1.0)) - 1);
    }
    $('#ui-slider-handle').css(
      'left', this.sliderPos * ($('#ui-slider-bar').width()! - 2) / (this.sliderLength * 1.0));
  }

  addSavedRevision = (position: number, info?:any) => {
    const newSavedRevision = $('<div></div>');
    newSavedRevision.addClass('star');

    newSavedRevision.attr('pos', position);
    newSavedRevision.css(
      'left', (position * ($('#ui-slider-bar').width()! - 2) / (this.sliderLength * 1.0)) - 1);
    $('#ui-slider-bar').append(newSavedRevision);
    newSavedRevision.on('mouseup', (evt) => {
      this.setSliderPosition(position);
    });
    this.savedRevisions.push(newSavedRevision);
  }
  /* Begin small 'API' */

  onSlider = (callback: (val: number) => void ) => {
    this.slidercallbacks.push(callback);
  }
  getSliderPosition = () => this.sliderPos
  setSliderPosition = (newpos: number) => {
    newpos = Number(newpos);
    if (newpos < 0 || newpos > this.sliderLength) return;
    if (!newpos) {
      newpos = 0; // stops it from displaying NaN if newpos isn't set
    }
    window.location.hash = `#${newpos}`;
    $('#ui-slider-handle').css(
      'left', newpos * ($('#ui-slider-bar').width()! - 2) / (this.sliderLength * 1.0));
    $('a.tlink').map(function () {
      $(this).attr('href', $(this).attr('thref')!.replace('%revision%', String(newpos)));
    });

    $('#revision_label').html(html10n.get('timeslider.version', {version: newpos}));

    $('#leftstar, #leftstep').toggleClass('disabled', newpos === 0);
    $('#rightstar, #rightstep').toggleClass('disabled', newpos === this.sliderLength);

    this.sliderPos = newpos;
    this.callSliderCallbacks(newpos);
  }
  getSliderLength = () => this.sliderLength;
  setSliderLength = (newlength: number) => {
    this.sliderLength = newlength;
    this.updateSliderElements();
  }
  // just take over the whole slider screen with a reconnect message
  showReconnectUI = () => {
    padmodals.showModal('disconnected');
  }

  setAuthors = (authors: UserInfo[]) => {
    const authorsList = $('#authorsList');
    authorsList.empty();
    let numAnonymous = 0;
    let numNamed = 0;
    const colorsAnonymous: number[] = [];
    _.each(authors, (author: UserInfo) => {
      if (author) {
        const authorColor = window.clientVars.colorPalette[author.colorId] || author.colorId;
        if (author.name) {
          if (numNamed !== 0) authorsList.append(', ');
          const textColor =
            colorutils.textColorFromBackgroundColor(authorColor, window.clientVars.skinName);
          $('<span />')
            .text(author.name || 'unnamed')
            .css('background-color', authorColor)
            .css('color', textColor)
            .addClass('author')
            .appendTo(authorsList);

          numNamed++;
        } else {
          numAnonymous++;
          if (authorColor) colorsAnonymous.push(authorColor);
        }
      }
    });
    if (numAnonymous > 0) {
      const anonymousAuthorString = html10n.get('timeslider.unnamedauthors', {num: numAnonymous});

      if (numNamed !== 0) {
        authorsList.append(` + ${anonymousAuthorString}`);
      } else {
        authorsList.append(anonymousAuthorString);
      }

      if (colorsAnonymous.length > 0) {
        authorsList.append(' (');
        _.each(colorsAnonymous, (color: number, i: number) => {
          if (i > 0) authorsList.append(' ');
          $('<span>&nbsp;</span>')
            .css('background-color', color)
            .addClass('author author-anonymous')
            .appendTo(authorsList);
        });
        authorsList.append(')');
      }
    }
    if (authors.length === 0) {
      authorsList.append(html10n.get('timeslider.toolbar.authorsList'));
    }
  }
  playButtonUpdater = () => {
    if (this.sliderPlaying) {
      if (this.getSliderPosition() + 1 > this.sliderLength) {
        $('#playpause_button_icon').toggleClass('pause');
        this.sliderPlaying = false;
        return;
      }
      this.setSliderPosition(this.getSliderPosition() + 1);

      setTimeout(this.playButtonUpdater, 100);
    }
  }
  playpause = () => {
    $('#playpause_button_icon').toggleClass('pause');

    if (!this.sliderPlaying) {
      if (this.getSliderPosition() === this.sliderLength) this.setSliderPosition(0);
      this.sliderPlaying = true;
      this.playButtonUpdater();
    } else {
      this.sliderPlaying = false;
    }
  }
  isSliderActive= () => this.sliderActive
}



export default new BroadcastSlider();
