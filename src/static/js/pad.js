/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

/**
 * Copyright 2009 Google Inc., 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
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

/* global $, window */

let socket;

// These jQuery things should create local references, but for now `require()`
// assigns to the global `$` and augments it with plugins.
require('./jquery');
require('./farbtastic');
require('./excanvas');

const Cookies = require('./pad_utils').Cookies;
const chat = require('./chat').chat;
const getCollabClient = require('./collab_client').getCollabClient;
const padconnectionstatus = require('./pad_connectionstatus').padconnectionstatus;
const padcookie = require('./pad_cookie').padcookie;
const padeditbar = require('./pad_editbar').padeditbar;
const padeditor = require('./pad_editor').padeditor;
const padimpexp = require('./pad_impexp').padimpexp;
const padmodals = require('./pad_modals').padmodals;
const padsavedrevs = require('./pad_savedrevs');
const paduserlist = require('./pad_userlist').paduserlist;
const padutils = require('./pad_utils').padutils;
const colorutils = require('./colorutils').colorutils;
var randomString = require('./pad_utils').randomString;
const gritter = require('./gritter').gritter;

const hooks = require('./pluginfw/hooks');

let receivedClientVars = false;

function randomString() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const string_length = 20;
  let randomstring = '';
  for (let i = 0; i < string_length; i++) {
    const rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return `t.${randomstring}`;
}

// This array represents all GET-parameters which can be used to change a setting.
//   name:     the parameter-name, eg  `?noColors=true`  =>  `noColors`
//   checkVal: the callback is only executed when
//                * the parameter was supplied and matches checkVal
//                * the parameter was supplied and checkVal is null
//   callback: the function to call when all above succeeds, `val` is the value supplied by the user
const getParameters = [
  {name: 'noColors', checkVal: 'true', callback(val) { settings.noColors = true; $('#clearAuthorship').hide(); }},
  {name: 'showControls', checkVal: 'true', callback(val) { $('#editbar').css('display', 'flex'); }},
  {name: 'showChat', checkVal: null, callback(val) { if (val === 'false') { settings.hideChat = true; chat.hide(); $('#chaticon').hide(); } }},
  {name: 'showLineNumbers', checkVal: 'false', callback(val) { settings.LineNumbersDisabled = true; }},
  {name: 'useMonospaceFont', checkVal: 'true', callback(val) { settings.useMonospaceFontGlobal = true; }},
  // If the username is set as a parameter we should set a global value that we can call once we have initiated the pad.
  {name: 'userName', checkVal: null, callback(val) { settings.globalUserName = decodeURIComponent(val); clientVars.userName = decodeURIComponent(val); }},
  // If the userColor is set as a parameter, set a global value to use once we have initiated the pad.
  {name: 'userColor', checkVal: null, callback(val) { settings.globalUserColor = decodeURIComponent(val); clientVars.userColor = decodeURIComponent(val); }},
  {name: 'rtl', checkVal: 'true', callback(val) { settings.rtlIsTrue = true; }},
  {name: 'alwaysShowChat', checkVal: 'true', callback(val) { if (!settings.hideChat) chat.stickToScreen(); }},
  {name: 'chatAndUsers', checkVal: 'true', callback(val) { chat.chatAndUsers(); }},
  {name: 'lang', checkVal: null, callback(val) { window.html10n.localize([val, 'en']); Cookies.set('language', val); }},
];

function getParams() {
  // Tries server enforced options first..
  for (var i = 0; i < getParameters.length; i++) {
    var setting = getParameters[i];
    var value = clientVars.padOptions[setting.name];
    if (value.toString() === setting.checkVal) {
      setting.callback(value);
    }
  }

  // Then URL applied stuff
  const params = getUrlVars();

  for (var i = 0; i < getParameters.length; i++) {
    var setting = getParameters[i];
    var value = params[setting.name];

    if (value && (value == setting.checkVal || setting.checkVal == null)) {
      setting.callback(value);
    }
  }
}

function getUrlVars() {
  const vars = []; let
    hash;
  const hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
  for (let i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    vars.push(hash[0]);
    vars[hash[0]] = hash[1];
  }
  return vars;
}

function sendClientReady(isReconnect, messageType) {
  messageType = typeof messageType !== 'undefined' ? messageType : 'CLIENT_READY';
  let padId = document.location.pathname.substring(document.location.pathname.lastIndexOf('/') + 1);
  padId = decodeURIComponent(padId); // unescape neccesary due to Safari and Opera interpretation of spaces

  if (!isReconnect) {
    const titleArray = document.title.split('|');
    const title = titleArray[titleArray.length - 1];
    document.title = `${padId.replace(/_+/g, ' ')} | ${title}`;
  }

  let token = Cookies.get('token');
  if (token == null) {
    token = `t.${randomString()}`;
    Cookies.set('token', token, {expires: 60});
  }

  const msg = {
    component: 'pad',
    type: messageType,
    padId,
    sessionID: Cookies.get('sessionID'),
    token,
    protocolVersion: 2,
  };

  // this is a reconnect, lets tell the server our revisionnumber
  if (isReconnect) {
    msg.client_rev = pad.collabClient.getCurrentRevisionNumber();
    msg.reconnect = true;
  }

  socket.json.send(msg);
}

function handshake() {
  const loc = document.location;
  // get the correct port
  const port = loc.port == '' ? (loc.protocol == 'https:' ? 443 : 80) : loc.port;
  // create the url
  const url = `${loc.protocol}//${loc.hostname}:${port}/`;
  // find out in which subfolder we are
  const resource = `${exports.baseURL.substring(1)}socket.io`;
  // connect
  socket = pad.socket = io.connect(url, {
    // Allow deployers to host Etherpad on a non-root path
    path: `${exports.baseURL}socket.io`,
    resource,
    reconnectionAttempts: 5,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.once('connect', () => {
    sendClientReady(false);
  });

  socket.on('reconnect', () => {
    // pad.collabClient might be null if the hanshake failed (or it never got that far).
    if (pad.collabClient != null) {
      pad.collabClient.setChannelState('CONNECTED');
    }
    sendClientReady(receivedClientVars);
  });

  socket.on('reconnecting', () => {
    // pad.collabClient might be null if the hanshake failed (or it never got that far).
    if (pad.collabClient != null) {
      pad.collabClient.setStateIdle();
      pad.collabClient.setIsPendingRevision(true);
      pad.collabClient.setChannelState('RECONNECTING');
    }
  });

  socket.on('reconnect_failed', (error) => {
    // pad.collabClient might be null if the hanshake failed (or it never got that far).
    if (pad.collabClient != null) {
      pad.collabClient.setChannelState('DISCONNECTED', 'reconnect_timeout');
    } else {
      throw new Error('Reconnect timed out');
    }
  });

  socket.on('error', (error) => {
    // pad.collabClient might be null if the error occurred before the hanshake completed.
    if (pad.collabClient != null) {
      pad.collabClient.setStateIdle();
      pad.collabClient.setIsPendingRevision(true);
    }
    throw new Error(`socket.io connection error: ${JSON.stringify(error)}`);
  });

  let initalized = false;

  socket.on('message', (obj) => {
    // the access was not granted, give the user a message
    if (obj.accessStatus) {
      if (obj.accessStatus == 'deny') {
        $('#loading').hide();
        $('#permissionDenied').show();

        if (receivedClientVars) {
          // got kicked
          $('#editorcontainer').hide();
          $('#editorloadingbox').show();
        }
      }
    }

    // if we haven't recieved the clientVars yet, then this message should it be
    else if (!receivedClientVars && obj.type == 'CLIENT_VARS') {
      receivedClientVars = true;

      // set some client vars
      clientVars = obj.data;
      clientVars.userAgent = 'Anonymous';
      clientVars.collab_client_vars.clientAgent = 'Anonymous';

      // initalize the pad
      pad._afterHandshake();
      initalized = true;

      if (clientVars.readonly) {
        chat.hide();
        $('#myusernameedit').attr('disabled', true);
        $('#chatinput').attr('disabled', true);
        $('#chaticon').hide();
        $('#options-chatandusers').parent().hide();
        $('#options-stickychat').parent().hide();
      } else if (!settings.hideChat) { $('#chaticon').show(); }

      $('body').addClass(clientVars.readonly ? 'readonly' : 'readwrite');

      padeditor.ace.callWithAce((ace) => {
        ace.ace_setEditable(!clientVars.readonly);
      });

      // If the LineNumbersDisabled value is set to true then we need to hide the Line Numbers
      if (settings.LineNumbersDisabled == true) {
        pad.changeViewOption('showLineNumbers', false);
      }

      // If the noColors value is set to true then we need to hide the background colors on the ace spans
      if (settings.noColors == true) {
        pad.changeViewOption('noColors', true);
      }

      if (settings.rtlIsTrue == true) {
        pad.changeViewOption('rtlIsTrue', true);
      }

      // If the Monospacefont value is set to true then change it to monospace.
      if (settings.useMonospaceFontGlobal == true) {
        pad.changeViewOption('padFontFamily', 'monospace');
      }
      // if the globalUserName value is set we need to tell the server and the client about the new authorname
      if (settings.globalUserName !== false) {
        pad.notifyChangeName(settings.globalUserName); // Notifies the server
        pad.myUserInfo.name = settings.globalUserName;
        $('#myusernameedit').val(settings.globalUserName); // Updates the current users UI
      }
      if (settings.globalUserColor !== false && colorutils.isCssHex(settings.globalUserColor)) {
        // Add a 'globalUserColor' property to myUserInfo, so collabClient knows we have a query parameter.
        pad.myUserInfo.globalUserColor = settings.globalUserColor;
        pad.notifyChangeColor(settings.globalUserColor); // Updates pad.myUserInfo.colorId
        paduserlist.setMyUserInfo(pad.myUserInfo);
      }
    }
    // This handles every Message after the clientVars
    else {
      // this message advices the client to disconnect
      if (obj.disconnect) {
        padconnectionstatus.disconnected(obj.disconnect);
        socket.disconnect();

        // block user from making any change to the pad
        padeditor.disable();
        padeditbar.disable();
        padimpexp.disable();

        return;
      } else {
        pad.collabClient.handleMessageFromServer(obj);
      }
    }
  });
  // Bind the colorpicker
  const fb = $('#colorpicker').farbtastic({callback: '#mycolorpickerpreview', width: 220});
  // Bind the read only button
  $('#readonlyinput').on('click', () => {
    padeditbar.setEmbedLinks();
  });
}

var pad = {
  // don't access these directly from outside this file, except
  // for debugging
  collabClient: null,
  myUserInfo: null,
  diagnosticInfo: {},
  initTime: 0,
  clientTimeOffset: null,
  padOptions: {},

  // these don't require init; clientVars should all go through here
  getPadId() {
    return clientVars.padId;
  },
  getClientIp() {
    return clientVars.clientIp;
  },
  getColorPalette() {
    return clientVars.colorPalette;
  },
  getDisplayUserAgent() {
    return padutils.uaDisplay(clientVars.userAgent);
  },
  getIsDebugEnabled() {
    return clientVars.debugEnabled;
  },
  getPrivilege(name) {
    return clientVars.accountPrivs[name];
  },
  getUserIsGuest() {
    return clientVars.userIsGuest;
  },
  getUserId() {
    return pad.myUserInfo.userId;
  },
  getUserName() {
    return pad.myUserInfo.name;
  },
  userList() {
    return paduserlist.users();
  },
  switchToPad(padId) {
    let newHref = new RegExp(/.*\/p\/[^\/]+/).exec(document.location.pathname) || clientVars.padId;
    newHref = newHref[0];

    const options = clientVars.padOptions;
    if (typeof options !== 'undefined' && options != null) {
      var option_str = [];
      $.each(options, (k, v) => {
        const str = `${k}=${v}`;
        option_str.push(str);
      });
      var option_str = option_str.join('&');

      newHref = `${newHref}?${option_str}`;
    }

    // destroy old pad from DOM
    // See https://github.com/ether/etherpad-lite/pull/3915
    // TODO: Check if Destroying is enough and doesn't leave negative stuff
    // See ace.js "editor.destroy" for a reference of how it was done before
    $('#editorcontainer').find('iframe')[0].remove();

    if (window.history && window.history.pushState) {
      $('#chattext p').remove(); // clear the chat messages
      window.history.pushState('', '', newHref);
      receivedClientVars = false;
      sendClientReady(false, 'SWITCH_TO_PAD');
    } else // fallback
    {
      window.location.href = newHref;
    }
  },
  sendClientMessage(msg) {
    pad.collabClient.sendClientMessage(msg);
  },

  init() {
    padutils.setupGlobalExceptionHandler();

    $(document).ready(() => {
      // start the custom js
      if (typeof customStart === 'function') customStart();
      handshake();

      // To use etherpad you have to allow cookies.
      // This will check if the prefs-cookie is set.
      // Otherwise it shows up a message to the user.
      padcookie.init();
    });
  },
  _afterHandshake() {
    pad.clientTimeOffset = Date.now() - clientVars.serverTimestamp;
    // initialize the chat
    chat.init(this);
    getParams();

    padcookie.init(); // initialize the cookies
    pad.initTime = +(new Date());
    pad.padOptions = clientVars.initialOptions;

    // for IE
    if (browser.msie) {
      try {
        document.execCommand('BackgroundImageCache', false, true);
      } catch (e) {}
    }

    // order of inits is important here:
    pad.myUserInfo = {
      userId: clientVars.userId,
      name: clientVars.userName,
      ip: pad.getClientIp(),
      colorId: clientVars.userColor,
      userAgent: pad.getDisplayUserAgent(),
    };

    padimpexp.init(this);
    padsavedrevs.init(this);

    padeditor.init(postAceInit, pad.padOptions.view || {}, this);

    paduserlist.init(pad.myUserInfo, this);
    padconnectionstatus.init();
    padmodals.init(this);

    pad.collabClient = getCollabClient(padeditor.ace, clientVars.collab_client_vars, pad.myUserInfo, {
      colorPalette: pad.getColorPalette(),
    }, pad);
    pad.collabClient.setOnUserJoin(pad.handleUserJoin);
    pad.collabClient.setOnUpdateUserInfo(pad.handleUserUpdate);
    pad.collabClient.setOnUserLeave(pad.handleUserLeave);
    pad.collabClient.setOnClientMessage(pad.handleClientMessage);
    pad.collabClient.setOnServerMessage(pad.handleServerMessage);
    pad.collabClient.setOnChannelStateChange(pad.handleChannelStateChange);
    pad.collabClient.setOnInternalAction(pad.handleCollabAction);

    // load initial chat-messages
    if (clientVars.chatHead != -1) {
      const chatHead = clientVars.chatHead;
      const start = Math.max(chatHead - 100, 0);
      pad.collabClient.sendMessage({type: 'GET_CHAT_MESSAGES', start, end: chatHead});
    } else // there are no messages
    {
      $('#chatloadmessagesbutton').css('display', 'none');
    }

    function postAceInit() {
      padeditbar.init();
      setTimeout(() => {
        padeditor.ace.focus();
      }, 0);
      if (padcookie.getPref('chatAlwaysVisible')) { // if we have a cookie for always showing chat then show it
        chat.stickToScreen(true); // stick it to the screen
        $('#options-stickychat').prop('checked', true); // set the checkbox to on
      }
      if (padcookie.getPref('chatAndUsers')) { // if we have a cookie for always showing chat then show it
        chat.chatAndUsers(true); // stick it to the screen
        $('#options-chatandusers').prop('checked', true); // set the checkbox to on
      }
      if (padcookie.getPref('showAuthorshipColors') == false) {
        pad.changeViewOption('showAuthorColors', false);
      }
      if (padcookie.getPref('showLineNumbers') == false) {
        pad.changeViewOption('showLineNumbers', false);
      }
      if (padcookie.getPref('rtlIsTrue') == true) {
        pad.changeViewOption('rtlIsTrue', true);
      }
      pad.changeViewOption('padFontFamily', padcookie.getPref('padFontFamily'));
      $('#viewfontmenu').val(padcookie.getPref('padFontFamily')).niceSelect('update');

      // Prevent sticky chat or chat and users to be checked for mobiles
      function checkChatAndUsersVisibility(x) {
        if (x.matches) { // If media query matches
          $('#options-chatandusers:checked').click();
          $('#options-stickychat:checked').click();
        }
      }
      const mobileMatch = window.matchMedia('(max-width: 800px)');
      mobileMatch.addListener(checkChatAndUsersVisibility); // check if window resized
      setTimeout(() => { checkChatAndUsersVisibility(mobileMatch); }, 0); // check now after load

      $('#editorcontainer').addClass('initialized');

      hooks.aCallAll('postAceInit', {ace: padeditor.ace, pad});
    }
  },
  dispose() {
    padeditor.dispose();
  },
  notifyChangeName(newName) {
    pad.myUserInfo.name = newName;
    pad.collabClient.updateUserInfo(pad.myUserInfo);
  },
  notifyChangeColor(newColorId) {
    pad.myUserInfo.colorId = newColorId;
    pad.collabClient.updateUserInfo(pad.myUserInfo);
  },
  changePadOption(key, value) {
    const options = {};
    options[key] = value;
    pad.handleOptionsChange(options);
    pad.collabClient.sendClientMessage(
        {
          type: 'padoptions',
          options,
          changedBy: pad.myUserInfo.name || 'unnamed',
        });
  },
  changeViewOption(key, value) {
    const options = {
      view: {},
    };
    options.view[key] = value;
    pad.handleOptionsChange(options);
  },
  handleOptionsChange(opts) {
    // opts object is a full set of options or just
    // some options to change
    if (opts.view) {
      if (!pad.padOptions.view) {
        pad.padOptions.view = {};
      }
      for (const k in opts.view) {
        pad.padOptions.view[k] = opts.view[k];
        padcookie.setPref(k, opts.view[k]);
      }
      padeditor.setViewOptions(pad.padOptions.view);
    }
    if (opts.guestPolicy) {
      // order important here
      pad.padOptions.guestPolicy = opts.guestPolicy;
    }
  },
  getPadOptions() {
    // caller shouldn't mutate the object
    return pad.padOptions;
  },
  isPadPublic() {
    return pad.getPadOptions().guestPolicy == 'allow';
  },
  suggestUserName(userId, name) {
    pad.collabClient.sendClientMessage(
        {
          type: 'suggestUserName',
          unnamedId: userId,
          newName: name,
        });
  },
  handleUserJoin(userInfo) {
    paduserlist.userJoinOrUpdate(userInfo);
  },
  handleUserUpdate(userInfo) {
    paduserlist.userJoinOrUpdate(userInfo);
  },
  handleUserLeave(userInfo) {
    paduserlist.userLeave(userInfo);
  },
  handleClientMessage(msg) {
    if (msg.type == 'suggestUserName') {
      if (msg.unnamedId == pad.myUserInfo.userId && msg.newName && !pad.myUserInfo.name) {
        pad.notifyChangeName(msg.newName);
        paduserlist.setMyUserInfo(pad.myUserInfo);
      }
    } else if (msg.type == 'newRevisionList') {
      padsavedrevs.newRevisionList(msg.revisionList);
    } else if (msg.type == 'revisionLabel') {
      padsavedrevs.newRevisionList(msg.revisionList);
    } else if (msg.type == 'padoptions') {
      const opts = msg.options;
      pad.handleOptionsChange(opts);
    } else if (msg.type == 'guestanswer') {
      // someone answered a prompt, remove it
      paduserlist.removeGuestPrompt(msg.guestId);
    }
  },
  dmesg(m) {
    if (pad.getIsDebugEnabled()) {
      const djs = $('#djs').get(0);
      const wasAtBottom = (djs.scrollTop - (djs.scrollHeight - $(djs).height()) >= -20);
      $('#djs').append(`<p>${m}</p>`);
      if (wasAtBottom) {
        djs.scrollTop = djs.scrollHeight;
      }
    }
  },
  handleServerMessage(m) {
    if (m.type == 'NOTICE') {
      if (m.text) {
        alertBar.displayMessage((abar) => {
          abar.find('#servermsgdate').text(` (${padutils.simpleDateTime(new Date())})`);
          abar.find('#servermsgtext').text(m.text);
        });
      }
      if (m.js) {
        window['ev' + 'al'](m.js);
      }
    } else if (m.type == 'GUEST_PROMPT') {
      paduserlist.showGuestPrompt(m.userId, m.displayName);
    }
  },
  handleChannelStateChange(newState, message) {
    const oldFullyConnected = !!padconnectionstatus.isFullyConnected();
    const wasConnecting = (padconnectionstatus.getStatus().what == 'connecting');
    if (newState == 'CONNECTED') {
      padeditor.enable();
      padeditbar.enable();
      padimpexp.enable();
      padconnectionstatus.connected();
    } else if (newState == 'RECONNECTING') {
      padeditor.disable();
      padeditbar.disable();
      padimpexp.disable();
      padconnectionstatus.reconnecting();
    } else if (newState == 'DISCONNECTED') {
      pad.diagnosticInfo.disconnectedMessage = message;
      pad.diagnosticInfo.padId = pad.getPadId();
      pad.diagnosticInfo.socket = {};

      // we filter non objects from the socket object and put them in the diagnosticInfo
      // this ensures we have no cyclic data - this allows us to stringify the data
      for (const i in socket.socket) {
        const value = socket.socket[i];
        const type = typeof value;

        if (type == 'string' || type == 'number') {
          pad.diagnosticInfo.socket[i] = value;
        }
      }

      pad.asyncSendDiagnosticInfo();
      if (typeof window.ajlog === 'string') {
        window.ajlog += (`Disconnected: ${message}\n`);
      }
      padeditor.disable();
      padeditbar.disable();
      padimpexp.disable();

      padconnectionstatus.disconnected(message);
    }
    const newFullyConnected = !!padconnectionstatus.isFullyConnected();
    if (newFullyConnected != oldFullyConnected) {
      pad.handleIsFullyConnected(newFullyConnected, wasConnecting);
    }
  },
  handleIsFullyConnected(isConnected, isInitialConnect) {
    pad.determineChatVisibility(isConnected && !isInitialConnect);
    pad.determineChatAndUsersVisibility(isConnected && !isInitialConnect);
    pad.determineAuthorshipColorsVisibility();
    setTimeout(() => {
      padeditbar.toggleDropDown('none');
    }, 1000);
  },
  determineChatVisibility(asNowConnectedFeedback) {
    const chatVisCookie = padcookie.getPref('chatAlwaysVisible');
    if (chatVisCookie) { // if the cookie is set for chat always visible
      chat.stickToScreen(true); // stick it to the screen
      $('#options-stickychat').prop('checked', true); // set the checkbox to on
    } else {
      $('#options-stickychat').prop('checked', false); // set the checkbox for off
    }
  },
  determineChatAndUsersVisibility(asNowConnectedFeedback) {
    const chatAUVisCookie = padcookie.getPref('chatAndUsersVisible');
    if (chatAUVisCookie) { // if the cookie is set for chat always visible
      chat.chatAndUsers(true); // stick it to the screen
      $('#options-chatandusers').prop('checked', true); // set the checkbox to on
    } else {
      $('#options-chatandusers').prop('checked', false); // set the checkbox for off
    }
  },
  determineAuthorshipColorsVisibility() {
    const authColCookie = padcookie.getPref('showAuthorshipColors');
    if (authColCookie) {
      pad.changeViewOption('showAuthorColors', true);
      $('#options-colorscheck').prop('checked', true);
    } else {
      $('#options-colorscheck').prop('checked', false);
    }
  },
  handleCollabAction(action) {
    if (action == 'commitPerformed') {
      padeditbar.setSyncStatus('syncing');
    } else if (action == 'newlyIdle') {
      padeditbar.setSyncStatus('done');
    }
  },
  hideServerMessage() {
    alertBar.hideMessage();
  },
  asyncSendDiagnosticInfo() {
    window.setTimeout(() => {
      $.ajax(
          {
            type: 'post',
            url: 'ep/pad/connection-diagnostic-info',
            data: {
              diagnosticInfo: JSON.stringify(pad.diagnosticInfo),
            },
            success() {},
            error() {},
          });
    }, 0);
  },
  forceReconnect() {
    $('form#reconnectform input.padId').val(pad.getPadId());
    pad.diagnosticInfo.collabDiagnosticInfo = pad.collabClient.getDiagnosticInfo();
    $('form#reconnectform input.diagnosticInfo').val(JSON.stringify(pad.diagnosticInfo));
    $('form#reconnectform input.missedChanges').val(JSON.stringify(pad.collabClient.getMissedChanges()));
    $('form#reconnectform').submit();
  },
  // this is called from code put into a frame from the server:
  handleImportExportFrameCall(callName, varargs) {
    padimpexp.handleFrameCall.call(padimpexp, callName, Array.prototype.slice.call(arguments, 1));
  },
  callWhenNotCommitting(f) {
    pad.collabClient.callWhenNotCommitting(f);
  },
  getCollabRevisionNumber() {
    return pad.collabClient.getCurrentRevisionNumber();
  },
  isFullyConnected() {
    return padconnectionstatus.isFullyConnected();
  },
  addHistoricalAuthors(data) {
    if (!pad.collabClient) {
      window.setTimeout(() => {
        pad.addHistoricalAuthors(data);
      }, 1000);
    } else {
      pad.collabClient.addHistoricalAuthors(data);
    }
  },
};

var alertBar = (function () {
  const animator = padutils.makeShowHideAnimator(arriveAtAnimationState, false, 25, 400);

  function arriveAtAnimationState(state) {
    if (state == -1) {
      $('#alertbar').css('opacity', 0).css('display', 'block');
    } else if (state == 0) {
      $('#alertbar').css('opacity', 1);
    } else if (state == 1) {
      $('#alertbar').css('opacity', 0).css('display', 'none');
    } else if (state < 0) {
      $('#alertbar').css('opacity', state + 1);
    } else if (state > 0) {
      $('#alertbar').css('opacity', 1 - state);
    }
  }

  const self = {
    displayMessage(setupFunc) {
      animator.show();
      setupFunc($('#alertbar'));
    },
    hideMessage() {
      animator.hide();
    },
  };
  return self;
}());

function init() {
  return pad.init();
}

var settings = {
  LineNumbersDisabled: false,
  noColors: false,
  useMonospaceFontGlobal: false,
  globalUserName: false,
  globalUserColor: false,
  rtlIsTrue: false,
};

pad.settings = settings;
exports.baseURL = '';
exports.settings = settings;
exports.randomString = randomString;
exports.getParams = getParams;
exports.getUrlVars = getUrlVars;
exports.handshake = handshake;
exports.pad = pad;
exports.init = init;
exports.alertBar = alertBar;
