'use strict';

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

// These jQuery things should create local references, but for now `require()`
// assigns to the global `$` and augments it with plugins.

import {Cookies} from "./pad_utils";
import {randomString, padUtils as padutils} from "./pad_utils";
const hooks = require('./pluginfw/hooks');
import connect from './socketio'
import html10n from '../js/vendors/html10n'
import {Socket} from "socket.io";
import {ClientVarData, ClientVarMessage, ClientVarPayload, SocketIOMessage} from "./types/SocketIOMessage";
import {Func} from "mocha";

export type ChangeSetLoader = {
  handleMessageFromServer(msg: ClientVarMessage): void
}


export let token: string, padId: string, exportLinks: JQuery<HTMLElement>, socket:  Socket<any, any>, changesetLoader: ChangeSetLoader, BroadcastSlider: any;

export const init = () => {
  padutils.setupGlobalExceptionHandler();
  $(document).ready(() => {
    // start the custom js
    // @ts-ignore
    if (typeof customStart === 'function') customStart(); // eslint-disable-line no-undef

    // get the padId out of the url
    const urlParts = document.location.pathname.split('/');
    padId = decodeURIComponent(urlParts[urlParts.length - 2]);

    // set the title
    document.title = `${padId.replace(/_+/g, ' ')} | ${document.title}`;

    // ensure we have a token
    token = Cookies.get('token')!;
    if (token == null) {
      token = `t.${randomString()}`;
      Cookies.set('token', token, {expires: 60});
    }

    socket = connect(baseURL, '/', {query: {padId}});

    // send the ready message once we're connected
    socket.on('connect', () => {
      sendSocketMsg('CLIENT_READY', {});
    });

    socket.on('disconnect', (reason) => {
      BroadcastSlider.showReconnectUI();
      // The socket.io client will automatically try to reconnect for all reasons other than "io
      // server disconnect".
      console.log("Disconnected")
    });

    // route the incoming messages
    socket.on('message', (message: ClientVarMessage) => {
      if (message.type === 'CLIENT_VARS') {
        handleClientVars(message);
      } else if ("accessStatus" in message) {
        $('body').html('<h2>You have no permission to access this pad</h2>');
      } else if (message.type === 'CHANGESET_REQ' || message.type === 'COLLABROOM') {
        changesetLoader.handleMessageFromServer(message);
      }
    });

    // get all the export links
    exportLinks = $('#export > .exportlink');

    $('button#forcereconnect').on('click', () => {
      window.location.reload();
    });
    hooks.aCallAll('postTimesliderInit');
  });
};

// sends a message over the socket
const sendSocketMsg = (type: string, data: Object) => {
  socket.emit("message", {
    component: 'pad', // FIXME: Remove this stupidity!
    type,
    data,
    padId,
    token,
    sessionID: Cookies.get('sessionID'),
  });
};

const fireWhenAllScriptsAreLoaded: Function[] = [];

const handleClientVars = (message: ClientVarData) => {
  // save the client Vars
  window.clientVars = message.data;

  if (window.clientVars.sessionRefreshInterval) {
    const ping =
        () => $.ajax('../../_extendExpressSessionLifetime', {method: 'PUT'}).catch(() => {});
    setInterval(ping, window.clientVars.sessionRefreshInterval);
  }

  if(window.clientVars.mode === "development") {
    console.warn('Enabling development mode with live update')
    socket.on('liveupdate', ()=>{
      console.log('Doing live reload')
      location.reload()
    })
  }

  // load all script that doesn't work without the clientVars
  BroadcastSlider = require('./broadcast_slider')
      .loadBroadcastSliderJS(fireWhenAllScriptsAreLoaded);

  require('./broadcast_revisions').loadBroadcastRevisionsJS();
  changesetLoader = require('./broadcast')
      .loadBroadcastJS(socket, sendSocketMsg, fireWhenAllScriptsAreLoaded, BroadcastSlider);

  // initialize export ui
  require('./pad_impexp').padimpexp.init();

  // Create a base URI used for timeslider exports
  const baseURI = document.location.pathname;

  // change export urls when the slider moves
  BroadcastSlider.onSlider((revno: number) => {
    // exportLinks is a jQuery Array, so .each is allowed.
    exportLinks.each(function () {
      // Modified from regular expression to fix:
      // https://github.com/ether/etherpad-lite/issues/4071
      // Where a padId that was numeric would create the wrong export link
      // @ts-ignore
      if (this.href) {
        // @ts-ignore
        const type = this.href.split('export/')[1];
        let href = baseURI.split('timeslider')[0];
        href += `${revno}/export/${type}`;
        this.setAttribute('href', href);
      }
    });
  });

  // fire all start functions of these scripts, formerly fired with window.load
  for (let i = 0; i < fireWhenAllScriptsAreLoaded.length; i++) {
    fireWhenAllScriptsAreLoaded[i]();
  }
  $('#ui-slider-handle').css('left', $('#ui-slider-bar').width()! - 2);

  // Translate some strings where we only want to set the title not the actual values
  $('#playpause_button_icon').attr('title', html10n.get('timeslider.playPause'));
  $('#leftstep').attr('title', html10n.get('timeslider.backRevision'));
  $('#rightstep').attr('title', html10n.get('timeslider.forwardRevision'));

  // font family change
  $('#viewfontmenu').on('change', function () {
    // @ts-ignore
    $('#innerdocbody').css('font-family', $(this).val() || '');
  });
};

export let baseURL = ''

export const setBaseURl = (url: string)=>{
  baseURL = url
}