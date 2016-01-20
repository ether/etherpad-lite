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

var socket;

// These jQuery things should create local references, but for now `require()`
// assigns to the global `$` and augments it with plugins.
require('./jquery');
require('./farbtastic');
require('./excanvas');
JSON = require('./json2');

var chat = require('./chat').chat;
var getCollabClient = require('./collab_client').getCollabClient;
var padconnectionstatus = require('./pad_connectionstatus').padconnectionstatus;
var padcookie = require('./pad_cookie').padcookie;
var padeditbar = require('./pad_editbar').padeditbar;
var padeditor = require('./pad_editor').padeditor;
var padimpexp = require('./pad_impexp').padimpexp;
var padmodals = require('./pad_modals').padmodals;
var padsavedrevs = require('./pad_savedrevs');
var paduserlist = require('./pad_userlist').paduserlist;
var padutils = require('./pad_utils').padutils;
var colorutils = require('./colorutils').colorutils;
var createCookie = require('./pad_utils').createCookie;
var readCookie = require('./pad_utils').readCookie;
var randomString = require('./pad_utils').randomString;
var gritter = require('./gritter').gritter;

var hooks = require('./pluginfw/hooks');

var receivedClientVars = false;

function createCookie(name, value, days, path){ /* Warning Internet Explorer doesn't use this it uses the one from pad_utils.js */
  if (days)
  {
    var date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    var expires = "; expires=" + date.toGMTString();
  }
  else{
    var expires = "";
  }
  
  if(!path){ // If the path isn't set then just whack the cookie on the root path
    path = "/";
  }
  
  //Check if the browser is IE and if so make sure the full path is set in the cookie
  if((navigator.appName == 'Microsoft Internet Explorer') || ((navigator.appName == 'Netscape') && (new RegExp("Trident/.*rv:([0-9]{1,}[\.0-9]{0,})").exec(navigator.userAgent) != null))){
    document.cookie = name + "=" + value + expires + "; path="+document.location;
  }
  else{
    document.cookie = name + "=" + value + expires + "; path=" + path;
  }
}

function readCookie(name)
{
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++)
  {
    var c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function randomString()
{
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  var string_length = 20;
  var randomstring = '';
  for (var i = 0; i < string_length; i++)
  {
    var rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return "t." + randomstring;
}

// This array represents all GET-parameters which can be used to change a setting.
//   name:     the parameter-name, eg  `?noColors=true`  =>  `noColors`
//   checkVal: the callback is only executed when
//                * the parameter was supplied and matches checkVal
//                * the parameter was supplied and checkVal is null
//   callback: the function to call when all above succeeds, `val` is the value supplied by the user
var getParameters = [
  { name: "noColors",         checkVal: "true",  callback: function(val) { settings.noColors = true; $('#clearAuthorship').hide(); } },
  { name: "showControls",     checkVal: "false", callback: function(val) { $('#editbar').addClass('hideControlsEditbar'); $('#editorcontainer').addClass('hideControlsEditor'); } },
  { name: "showChat",         checkVal: "false", callback: function(val) { $('#chaticon').hide(); } },
  { name: "showLineNumbers",  checkVal: "false", callback: function(val) { settings.LineNumbersDisabled = true; } },
  { name: "useMonospaceFont", checkVal: "true",  callback: function(val) { settings.useMonospaceFontGlobal = true; } },
  // If the username is set as a parameter we should set a global value that we can call once we have initiated the pad.
  { name: "userName",         checkVal: null,    callback: function(val) { settings.globalUserName = decodeURIComponent(val); clientVars.userName = decodeURIComponent(val); } },
  // If the userColor is set as a parameter, set a global value to use once we have initiated the pad.
  { name: "userColor",        checkVal: null,    callback: function(val) { settings.globalUserColor = decodeURIComponent(val); clientVars.userColor = decodeURIComponent(val); } },
  { name: "rtl",              checkVal: "true",  callback: function(val) { settings.rtlIsTrue = true } },
  { name: "alwaysShowChat",   checkVal: "true",  callback: function(val) { chat.stickToScreen(); } },
  { name: "chatAndUsers",     checkVal: "true",  callback: function(val) { chat.chatAndUsers(); } },
  { name: "lang",             checkVal: null,    callback: function(val) { window.html10n.localize([val, 'en']); createCookie('language', val); } }
];

function getParams()
{
  // Tries server enforced options first..
  for(var i = 0; i < getParameters.length; i++)
  {
   var setting = getParameters[i];
    var value = clientVars.padOptions[setting.name];
    if(value.toString() === setting.checkVal)
    {
      setting.callback(value);
    }
  }
  
  // Then URL applied stuff
  var params = getUrlVars()
  
  for(var i = 0; i < getParameters.length; i++)
  {
    var setting = getParameters[i];
    var value = params[setting.name];
    
    if(value && (value == setting.checkVal || setting.checkVal == null))
    {
      setting.callback(value);
    }
  }
}

function getUrlVars()
{
  var vars = [], hash;
  var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
  for(var i = 0; i < hashes.length; i++)
  {
    hash = hashes[i].split('=');
    vars.push(hash[0]);
    vars[hash[0]] = hash[1];
  }
  return vars;
}

function savePassword()
{
  //set the password cookie
  createCookie("password",$("#passwordinput").val(),null,document.location.pathname);
  //reload
  document.location=document.location;
  return false;
}

function sendClientReady(isReconnect, messageType)
{
  messageType = typeof messageType !== 'undefined' ? messageType : 'CLIENT_READY';
  var padId = document.location.pathname.substring(document.location.pathname.lastIndexOf("/") + 1);
  padId = decodeURIComponent(padId); // unescape neccesary due to Safari and Opera interpretation of spaces

  if(!isReconnect)
  {
    var titleArray = document.title.split('|');
    var title = titleArray[titleArray.length - 1];
    document.title = padId.replace(/_+/g, ' ') + " | " + title;
  }

  var token = readCookie("token");
  if (token == null)
  {
    token = "t." + randomString();
    createCookie("token", token, 60);
  }
  
  var sessionID = decodeURIComponent(readCookie("sessionID"));
  var password = readCookie("password");

  var msg = {
    "component": "pad",
    "type": messageType,
    "padId": padId,
    "sessionID": sessionID,
    "password": password,
    "token": token,
    "protocolVersion": 2
  };
  
  //this is a reconnect, lets tell the server our revisionnumber
  if(isReconnect == true)
  {
    msg.client_rev=pad.collabClient.getCurrentRevisionNumber();
    msg.reconnect=true;
  }
  
  socket.json.send(msg);
}

function handshake()
{
  var loc = document.location;
  //get the correct port
  var port = loc.port == "" ? (loc.protocol == "https:" ? 443 : 80) : loc.port;
  //create the url
  var url = loc.protocol + "//" + loc.hostname + ":" + port + "/";
  //find out in which subfolder we are
  var resource =  exports.baseURL.substring(1)  + "socket.io";
  //connect
  socket = pad.socket = io.connect(url, {
    // Allow deployers to host Etherpad on a non-root path
    'path': exports.baseURL + "socket.io",
    'resource': resource,
    'max reconnection attempts': 3,
    'sync disconnect on unload' : false
  });

  var disconnectTimeout;

  socket.once('connect', function () {
    sendClientReady(false);
  });
  
  socket.on('reconnect', function () {
    //reconnect is before the timeout, lets stop the timeout
    if(disconnectTimeout)
    {
      clearTimeout(disconnectTimeout);
    }

    pad.collabClient.setChannelState("CONNECTED");
    pad.sendClientReady(true);
  });
  
  socket.on('disconnect', function (reason) {
    if(reason == "booted"){
      pad.collabClient.setChannelState("DISCONNECTED");
    } else {
      function disconnectEvent()
      {
        pad.collabClient.setChannelState("DISCONNECTED", "reconnect_timeout");
      }
      
      pad.collabClient.setChannelState("RECONNECTING");
      
      disconnectTimeout = setTimeout(disconnectEvent, 20000);
    }
  });

  var initalized = false;

  socket.on('message', function(obj)
  {
    //the access was not granted, give the user a message
    if(obj.accessStatus)
    {
      if(!receivedClientVars){
        $('.passForm').submit(require(module.id).savePassword);
      }

      if(obj.accessStatus == "deny")
      {
        $('#loading').hide();
        $("#permissionDenied").show();

        if(receivedClientVars)
        {
          // got kicked
          $("#editorcontainer").hide();
          $("#editorloadingbox").show();
        }
      }
      else if(obj.accessStatus == "needPassword")
      {
        $('#loading').hide();
        $('#passwordRequired').show();
        $("#passwordinput").focus();
      }
      else if(obj.accessStatus == "wrongPassword")
      {
        $('#loading').hide();
        $('#wrongPassword').show();
        $('#passwordRequired').show();
        $("#passwordinput").focus();
      }
    }
    
    //if we haven't recieved the clientVars yet, then this message should it be
    else if (!receivedClientVars && obj.type == "CLIENT_VARS")
    {
      //log the message
      if (window.console) console.log(obj);

      receivedClientVars = true;

      //set some client vars
      clientVars = obj.data;
      clientVars.userAgent = "Anonymous";
      clientVars.collab_client_vars.clientAgent = "Anonymous";
 
      //initalize the pad
      pad._afterHandshake();
      initalized = true;

      if(clientVars.readonly){
        chat.hide();
        $('#myusernameedit').attr("disabled", true);
        $('#chatinput').attr("disabled", true);
        $('#chaticon').hide();
        $('#options-chatandusers').parent().hide();
        $('#options-stickychat').parent().hide();
      }

      $("body").addClass(clientVars.readonly ? "readonly" : "readwrite")

      padeditor.ace.callWithAce(function (ace) {
        ace.ace_setEditable(!clientVars.readonly);
      });

      // If the LineNumbersDisabled value is set to true then we need to hide the Line Numbers
      if (settings.LineNumbersDisabled == true)
      {
        pad.changeViewOption('showLineNumbers', false);
      }

      // If the noColors value is set to true then we need to hide the background colors on the ace spans
      if (settings.noColors == true)
      {
        pad.changeViewOption('noColors', true);
      }
      
      if (settings.rtlIsTrue == true)
      {
        pad.changeViewOption('rtlIsTrue', true);
      }

      // If the Monospacefont value is set to true then change it to monospace.
      if (settings.useMonospaceFontGlobal == true)
      {
        pad.changeViewOption('useMonospaceFont', true);
      }
      // if the globalUserName value is set we need to tell the server and the client about the new authorname
      if (settings.globalUserName !== false)
      {
        pad.notifyChangeName(settings.globalUserName); // Notifies the server
        pad.myUserInfo.name = settings.globalUserName;
        $('#myusernameedit').val(settings.globalUserName); // Updates the current users UI
      }
      if (settings.globalUserColor !== false && colorutils.isCssHex(settings.globalUserColor))
      {

        // Add a 'globalUserColor' property to myUserInfo, so collabClient knows we have a query parameter.
        pad.myUserInfo.globalUserColor = settings.globalUserColor;
        pad.notifyChangeColor(settings.globalUserColor); // Updates pad.myUserInfo.colorId
        paduserlist.setMyUserInfo(pad.myUserInfo);
      }
    }
    //This handles every Message after the clientVars
    else
    {
      //this message advices the client to disconnect
      if (obj.disconnect)
      {
        console.warn("FORCED TO DISCONNECT");
        console.warn(obj);
        padconnectionstatus.disconnected(obj.disconnect);
        socket.disconnect();
        return;
      }
      else
      {
        pad.collabClient.handleMessageFromServer(obj);
      }
    }
  });
  // Bind the colorpicker
  var fb = $('#colorpicker').farbtastic({ callback: '#mycolorpickerpreview', width: 220});
  // Bind the read only button  
  $('#readonlyinput').on('click',function(){
    padeditbar.setEmbedLinks();
  });
}

$.extend($.gritter.options, { 
  position: 'bottom-right', // defaults to 'top-right' but can be 'bottom-left', 'bottom-right', 'top-left', 'top-right' (added in 1.7.1)
  fade: false, // dont fade, too jerky on mobile
  time: 6000 // hang on the screen for...
});

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
  getPadId: function()
  {
    return clientVars.padId;
  },
  getClientIp: function()
  {
    return clientVars.clientIp;
  },
  getColorPalette: function()
  {
    return clientVars.colorPalette;
  },
  getDisplayUserAgent: function()
  {
    return padutils.uaDisplay(clientVars.userAgent);
  },
  getIsDebugEnabled: function()
  {
    return clientVars.debugEnabled;
  },
  getPrivilege: function(name)
  {
    return clientVars.accountPrivs[name];
  },
  getUserIsGuest: function()
  {
    return clientVars.userIsGuest;
  },
  getUserId: function()
  {
    return pad.myUserInfo.userId;
  },
  getUserName: function()
  {
    return pad.myUserInfo.name;
  },
  userList: function()
  {
    return paduserlist.users();
  },
  sendClientReady: function(isReconnect, messageType)
  {
    messageType = typeof messageType !== 'undefined' ? messageType : 'CLIENT_READY';
    sendClientReady(isReconnect, messageType);
  },
  switchToPad: function(padId)
  {
    var options = document.location.href.split('?')[1];
    var newHref = padId;
    if (typeof options != "undefined" && options != null){
      newHref = newHref + '?' + options;
    }

    if(window.history && window.history.pushState)
    {
      $('#chattext p').remove(); //clear the chat messages
      window.history.pushState("", "", newHref);      
      receivedClientVars = false;
      sendClientReady(false, 'SWITCH_TO_PAD');
    }
    else // fallback
    {
      window.location.href = newHref;
    }
  },
  sendClientMessage: function(msg)
  {
    pad.collabClient.sendClientMessage(msg);
  },
  createCookie: createCookie,

  init: function()
  {
    padutils.setupGlobalExceptionHandler();

    $(document).ready(function()
    {
      // start the custom js
      if (typeof customStart == "function") customStart();
      handshake();

      // To use etherpad you have to allow cookies.
      // This will check if the creation of a test-cookie has success.
      // Otherwise it shows up a message to the user.
      createCookie("test", "test");
      if (!readCookie("test"))
      {
        $('#loading').hide();
        $('#noCookie').show();
      }
    });
  },
  _afterHandshake: function()
  {
    pad.clientTimeOffset = new Date().getTime() - clientVars.serverTimestamp;
    //initialize the chat
    chat.init(this);
    getParams();

    padcookie.init(); // initialize the cookies
    pad.initTime = +(new Date());
    pad.padOptions = clientVars.initialOptions;

    // for IE
    if (browser.msie)
    {
      try
      {
        document.execCommand("BackgroundImageCache", false, true);
      }
      catch (e)
      {}
    }

    // order of inits is important here:
    pad.myUserInfo = {
      userId: clientVars.userId,
      name: clientVars.userName,
      ip: pad.getClientIp(),
      colorId: clientVars.userColor,
      userAgent: pad.getDisplayUserAgent()
    };

    padimpexp.init(this);
    padsavedrevs.init(this);

    padeditor.init(postAceInit, pad.padOptions.view || {}, this);

    paduserlist.init(pad.myUserInfo, this);
    padconnectionstatus.init();
    padmodals.init(this);

    pad.collabClient = getCollabClient(padeditor.ace, clientVars.collab_client_vars, pad.myUserInfo, {
      colorPalette: pad.getColorPalette()
    }, pad);
    pad.collabClient.setOnUserJoin(pad.handleUserJoin);
    pad.collabClient.setOnUpdateUserInfo(pad.handleUserUpdate);
    pad.collabClient.setOnUserLeave(pad.handleUserLeave);
    pad.collabClient.setOnClientMessage(pad.handleClientMessage);
    pad.collabClient.setOnServerMessage(pad.handleServerMessage);
    pad.collabClient.setOnChannelStateChange(pad.handleChannelStateChange);
    pad.collabClient.setOnInternalAction(pad.handleCollabAction);

    // load initial chat-messages
    if(clientVars.chatHead != -1)
    {
      var chatHead = clientVars.chatHead;
      var start = Math.max(chatHead - 100, 0);
      pad.collabClient.sendMessage({"type": "GET_CHAT_MESSAGES", "start": start, "end": chatHead});
    }
    else // there are no messages
    {
      $("#chatloadmessagesbutton").css("display", "none");
    }

    function postAceInit()
    {
      padeditbar.init();
      setTimeout(function()
      {
        padeditor.ace.focus();
      }, 0);
      if(padcookie.getPref("chatAlwaysVisible")){ // if we have a cookie for always showing chat then show it
        chat.stickToScreen(true); // stick it to the screen
        $('#options-stickychat').prop("checked", true); // set the checkbox to on
      }
      if(padcookie.getPref("chatAndUsers")){ // if we have a cookie for always showing chat then show it
        chat.chatAndUsers(true); // stick it to the screen
        $('#options-chatandusers').prop("checked", true); // set the checkbox to on
      }
      if(padcookie.getPref("showAuthorshipColors") == false){
        pad.changeViewOption('showAuthorColors', false);
      }
      if(padcookie.getPref("showLineNumbers") == false){
        pad.changeViewOption('showLineNumbers', false);
      }
      if(padcookie.getPref("rtlIsTrue") == true){
        pad.changeViewOption('rtlIsTrue', true);
      }

      var fonts = ['useMonospaceFont', 'useOpenDyslexicFont', 'useComicSansFont', 'useCourierNewFont', 'useGeorgiaFont', 'useImpactFont',
        'useLucidaFont', 'useLucidaSansFont', 'usePalatinoFont', 'useTahomaFont', 'useTimesNewRomanFont',
        'useTrebuchetFont', 'useVerdanaFont', 'useSymbolFont', 'useWebdingsFont', 'useWingDingsFont', 'useSansSerifFont',
        'useSerifFont'];

      $.each(fonts, function(i, font){
        if(padcookie.getPref(font) == true){
          pad.changeViewOption(font, true);
        }
      })

      hooks.aCallAll("postAceInit", {ace: padeditor.ace, pad: pad});
    }
  },
  dispose: function()
  {
    padeditor.dispose();
  },
  notifyChangeName: function(newName)
  {
    pad.myUserInfo.name = newName;
    pad.collabClient.updateUserInfo(pad.myUserInfo);
  },
  notifyChangeColor: function(newColorId)
  {
    pad.myUserInfo.colorId = newColorId;
    pad.collabClient.updateUserInfo(pad.myUserInfo);
  },
  changePadOption: function(key, value)
  {
    var options = {};
    options[key] = value;
    pad.handleOptionsChange(options);
    pad.collabClient.sendClientMessage(
    {
      type: 'padoptions',
      options: options,
      changedBy: pad.myUserInfo.name || "unnamed"
    });
  },
  changeViewOption: function(key, value)
  {
    var options = {
      view: {}
    };
    options.view[key] = value;
    pad.handleOptionsChange(options);
  },
  handleOptionsChange: function(opts)
  {
    // opts object is a full set of options or just
    // some options to change
    if (opts.view)
    {
      if (!pad.padOptions.view)
      {
        pad.padOptions.view = {};
      }
      for (var k in opts.view)
      {
        pad.padOptions.view[k] = opts.view[k];
        padcookie.setPref(k, opts.view[k]);
      }
      padeditor.setViewOptions(pad.padOptions.view);
    }
    if (opts.guestPolicy)
    {
      // order important here
      pad.padOptions.guestPolicy = opts.guestPolicy;
    }
  },
  getPadOptions: function()
  {
    // caller shouldn't mutate the object
    return pad.padOptions;
  },
  isPadPublic: function()
  {
    return pad.getPadOptions().guestPolicy == 'allow';
  },
  suggestUserName: function(userId, name)
  {
    pad.collabClient.sendClientMessage(
    {
      type: 'suggestUserName',
      unnamedId: userId,
      newName: name
    });
  },
  handleUserJoin: function(userInfo)
  {
    paduserlist.userJoinOrUpdate(userInfo);
  },
  handleUserUpdate: function(userInfo)
  {
    paduserlist.userJoinOrUpdate(userInfo);
  },
  handleUserLeave: function(userInfo)
  {
    paduserlist.userLeave(userInfo);
  },
  handleClientMessage: function(msg)
  {
    if (msg.type == 'suggestUserName')
    {
      if (msg.unnamedId == pad.myUserInfo.userId && msg.newName && !pad.myUserInfo.name)
      {
        pad.notifyChangeName(msg.newName);
        paduserlist.setMyUserInfo(pad.myUserInfo);
      }
    }
    else if (msg.type == 'newRevisionList')
    {
      padsavedrevs.newRevisionList(msg.revisionList);
    }
    else if (msg.type == 'revisionLabel')
    {
      padsavedrevs.newRevisionList(msg.revisionList);
    }
    else if (msg.type == 'padoptions')
    {
      var opts = msg.options;
      pad.handleOptionsChange(opts);
    }
    else if (msg.type == 'guestanswer')
    {
      // someone answered a prompt, remove it
      paduserlist.removeGuestPrompt(msg.guestId);
    }
  },
  dmesg: function(m)
  {
    if (pad.getIsDebugEnabled())
    {
      var djs = $('#djs').get(0);
      var wasAtBottom = (djs.scrollTop - (djs.scrollHeight - $(djs).height()) >= -20);
      $('#djs').append('<p>' + m + '</p>');
      if (wasAtBottom)
      {
        djs.scrollTop = djs.scrollHeight;
      }
    }
  },
  handleServerMessage: function(m)
  {
    if (m.type == 'NOTICE')
    {
      if (m.text)
      {
        alertBar.displayMessage(function(abar)
        {
          abar.find("#servermsgdate").text(" (" + padutils.simpleDateTime(new Date) + ")");
          abar.find("#servermsgtext").text(m.text);
        });
      }
      if (m.js)
      {
        window['ev' + 'al'](m.js);
      }
    }
    else if (m.type == 'GUEST_PROMPT')
    {
      paduserlist.showGuestPrompt(m.userId, m.displayName);
    }
  },
  handleChannelStateChange: function(newState, message)
  {
    var oldFullyConnected = !! padconnectionstatus.isFullyConnected();
    var wasConnecting = (padconnectionstatus.getStatus().what == 'connecting');
    if (newState == "CONNECTED")
    {
      padconnectionstatus.connected();
    }
    else if (newState == "RECONNECTING")
    {
      padconnectionstatus.reconnecting();
    }
    else if (newState == "DISCONNECTED")
    {
      pad.diagnosticInfo.disconnectedMessage = message;
      pad.diagnosticInfo.padId = pad.getPadId();
      pad.diagnosticInfo.socket = {};
      
      //we filter non objects from the socket object and put them in the diagnosticInfo 
      //this ensures we have no cyclic data - this allows us to stringify the data
      for(var i in socket.socket)
      {
        var value = socket.socket[i];
        var type = typeof value;
        
        if(type == "string" || type == "number")
        {
          pad.diagnosticInfo.socket[i] = value;
        }
      }
    
      pad.asyncSendDiagnosticInfo();
      if (typeof window.ajlog == "string")
      {
        window.ajlog += ("Disconnected: " + message + '\n');
      }
      padeditor.disable();
      padeditbar.disable();
      padimpexp.disable();

      padconnectionstatus.disconnected(message);
    }
    var newFullyConnected = !! padconnectionstatus.isFullyConnected();
    if (newFullyConnected != oldFullyConnected)
    {
      pad.handleIsFullyConnected(newFullyConnected, wasConnecting);
    }
  },
  handleIsFullyConnected: function(isConnected, isInitialConnect)
  {
    pad.determineChatVisibility(isConnected && !isInitialConnect);
    pad.determineChatAndUsersVisibility(isConnected && !isInitialConnect);
    pad.determineAuthorshipColorsVisibility();
    setTimeout(function(){
      padeditbar.toggleDropDown("none");
    }, 1000);
  },
  determineChatVisibility: function(asNowConnectedFeedback){
    var chatVisCookie = padcookie.getPref('chatAlwaysVisible');
    if(chatVisCookie){ // if the cookie is set for chat always visible
      chat.stickToScreen(true); // stick it to the screen
      $('#options-stickychat').prop("checked", true); // set the checkbox to on
    }
    else{
      $('#options-stickychat').prop("checked", false); // set the checkbox for off
    }
  },
  determineChatAndUsersVisibility: function(asNowConnectedFeedback){
    var chatAUVisCookie = padcookie.getPref('chatAndUsersVisible');
    if(chatAUVisCookie){ // if the cookie is set for chat always visible
      chat.chatAndUsers(true); // stick it to the screen
      $('#options-chatandusers').prop("checked", true); // set the checkbox to on
    }
    else{
      $('#options-chatandusers').prop("checked", false); // set the checkbox for off
    }
  },
  determineAuthorshipColorsVisibility: function(){
    var authColCookie = padcookie.getPref('showAuthorshipColors');
    if (authColCookie){
      pad.changeViewOption('showAuthorColors', true);
      $('#options-colorscheck').prop("checked", true);
    }
    else {
      $('#options-colorscheck').prop("checked", false);
    }
  },
  handleCollabAction: function(action)
  {
    if (action == "commitPerformed")
    {
      padeditbar.setSyncStatus("syncing");
    }
    else if (action == "newlyIdle")
    {
      padeditbar.setSyncStatus("done");
    }
  },
  hideServerMessage: function()
  {
    alertBar.hideMessage();
  },
  asyncSendDiagnosticInfo: function()
  {
    window.setTimeout(function()
    {
      $.ajax(
      {
        type: 'post',
        url: '/ep/pad/connection-diagnostic-info',
        data: {
          diagnosticInfo: JSON.stringify(pad.diagnosticInfo)
        },
        success: function()
        {},
        error: function()
        {}
      });
    }, 0);
  },
  forceReconnect: function()
  {
    $('form#reconnectform input.padId').val(pad.getPadId());
    pad.diagnosticInfo.collabDiagnosticInfo = pad.collabClient.getDiagnosticInfo();
    $('form#reconnectform input.diagnosticInfo').val(JSON.stringify(pad.diagnosticInfo));
    $('form#reconnectform input.missedChanges').val(JSON.stringify(pad.collabClient.getMissedChanges()));
    $('form#reconnectform').submit();
  },
  // this is called from code put into a frame from the server:
  handleImportExportFrameCall: function(callName, varargs)
  {
    padimpexp.handleFrameCall.call(padimpexp, callName, Array.prototype.slice.call(arguments, 1));
  },
  callWhenNotCommitting: function(f)
  {
    pad.collabClient.callWhenNotCommitting(f);
  },
  getCollabRevisionNumber: function()
  {
    return pad.collabClient.getCurrentRevisionNumber();
  },
  isFullyConnected: function()
  {
    return padconnectionstatus.isFullyConnected();
  },
  addHistoricalAuthors: function(data)
  {
    if (!pad.collabClient)
    {
      window.setTimeout(function()
      {
        pad.addHistoricalAuthors(data);
      }, 1000);
    }
    else
    {
      pad.collabClient.addHistoricalAuthors(data);
    }
  }
};

var alertBar = (function()
{

  var animator = padutils.makeShowHideAnimator(arriveAtAnimationState, false, 25, 400);

  function arriveAtAnimationState(state)
  {
    if (state == -1)
    {
      $("#alertbar").css('opacity', 0).css('display', 'block');
    }
    else if (state == 0)
    {
      $("#alertbar").css('opacity', 1);
    }
    else if (state == 1)
    {
      $("#alertbar").css('opacity', 0).css('display', 'none');
    }
    else if (state < 0)
    {
      $("#alertbar").css('opacity', state + 1);
    }
    else if (state > 0)
    {
      $("#alertbar").css('opacity', 1 - state);
    }
  }

  var self = {
    displayMessage: function(setupFunc)
    {
      animator.show();
      setupFunc($("#alertbar"));
    },
    hideMessage: function()
    {
      animator.hide();
    }
  };
  return self;
}());

function init() {
  return pad.init();
}

var settings = {
  LineNumbersDisabled: false
, noColors: false
, useMonospaceFontGlobal: false
, globalUserName: false
, globalUserColor: false
, rtlIsTrue: false
};

pad.settings = settings;
exports.baseURL = '';
exports.settings = settings;
exports.createCookie = createCookie;
exports.readCookie = readCookie;
exports.randomString = randomString;
exports.getParams = getParams;
exports.getUrlVars = getUrlVars;
exports.savePassword = savePassword;
exports.handshake = handshake;
exports.pad = pad;
exports.init = init;
exports.alertBar = alertBar;
