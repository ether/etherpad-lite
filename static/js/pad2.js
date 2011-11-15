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
var LineNumbersDisabled = false;
var noColors = false;
var useMonospaceFontGlobal = false;
var globalUserName = false;

$(document).ready(function()
{
  //start the costum js
  if(typeof costumStart == "function") costumStart();
  getParams();
  handshake();
});

$(window).unload(function()
{
  pad.dispose();
});

function createCookie(name, value, days, path)
{
  if (days)
  {
    var date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    var expires = "; expires=" + date.toGMTString();
  }
  else var expires = "";
  
  if(!path)
    path = "/";
  
  document.cookie = name + "=" + value + expires + "; path=" + path;
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

function getParams()
{
  var showControls = getUrlVars()["showControls"];
  var showChat = getUrlVars()["showChat"];
  var userName = getUrlVars()["userName"];
  var showLineNumbers = getUrlVars()["showLineNumbers"];
  var useMonospaceFont = getUrlVars()["useMonospaceFont"];
  var IsnoColors = getUrlVars()["noColors"];

  if(IsnoColors)
  {
    if(IsnoColors == "true")
    {
      noColors = true;
    }
  }
  if(showControls)
  {
    if(showControls == "false")
    { 
      $('#editbar').hide();
      $('#editorcontainer').css({"top":"0px"});
    }
  }

  if(showChat)
  {
    if(showChat == "false")
    {
      $('#chaticon').hide();
    }
  }

  if(showLineNumbers)
  {
    if(showLineNumbers == "false")
    {
      LineNumbersDisabled = true;
    }
  }

  if(useMonospaceFont)
  {
    if(useMonospaceFont == "true")
    {
      useMonospaceFontGlobal = true;
    }
  }


  if(userName)
  {
    // If the username is set as a parameter we should set a global value that we can call once we have initiated the pad.
    globalUserName = unescape(userName);
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
}

function handshake()
{
  var loc = document.location;
  //get the correct port
  var port = loc.port == "" ? (loc.protocol == "https:" ? 443 : 80) : loc.port;
  //create the url
  var url = loc.protocol + "//" + loc.hostname + ":" + port + "/";
  //find out in which subfolder we are
  var resource = loc.pathname.substr(1, loc.pathname.indexOf("/p/")) + "socket.io";
  //connect
  socket = io.connect(url, {
    resource: resource
  });

  socket.once('connect', function()
  {
    var padId = document.location.pathname.substring(document.location.pathname.lastIndexOf("/") + 1);
    padId = unescape(padId); // unescape neccesary due to Safari and Opera interpretation of spaces

    document.title = document.title + " | " + padId;

    var token = readCookie("token");
    if (token == null)
    {
      token = randomString();
      createCookie("token", token, 60);
    }
    
    var sessionID = readCookie("sessionID");
    var password = readCookie("password");

    var msg = {
      "component": "pad",
      "type": "CLIENT_READY",
      "padId": padId,
      "sessionID": sessionID,
      "password": password,
      "token": token,
      "protocolVersion": 2
    };
    socket.json.send(msg);
  });

  var receivedClientVars = false;
  var initalized = false;

  socket.on('message', function(obj)
  {
    //the access was not granted, give the user a message
    if(!receivedClientVars && obj.accessStatus)
    {
      if(obj.accessStatus == "deny")
      {
        $("#editorloadingbox").html("<b>You do not have permission to access this pad</b>");
      }
      else if(obj.accessStatus == "needPassword")
      {
        $("#editorloadingbox").html("<b>You need a password to access this pad</b><br>" +
                                    "<input id='passwordinput' type='password' name='password'>"+
                                    "<button type='button' onclick='savePassword()'>ok</button>");
      }
      else if(obj.accessStatus == "wrongPassword")
      {
        $("#editorloadingbox").html("<b>You're password was wrong</b><br>" +
                                    "<input id='passwordinput' type='password' name='password'>"+
                                    "<button type='button' onclick='savePassword()'>ok</button>");
      }
    }
    
    //if we haven't recieved the clientVars yet, then this message should it be
    else if (!receivedClientVars)
    {
      //log the message
      if (window.console) console.log(obj);

      receivedClientVars = true;

      //set some client vars
      clientVars = obj;
      clientVars.userAgent = "Anonymous";
      clientVars.collab_client_vars.clientAgent = "Anonymous";

      //initalize the pad
      pad.init();
      initalized = true;

      // If the LineNumbersDisabled value is set to true then we need to hide the Line Numbers
      if (LineNumbersDisabled == true)
      {
        pad.changeViewOption('showLineNumbers', false);
      }

      // If the noColors value is set to true then we need to hide the backround colors on the ace spans
      if (noColors == true)
      {
        pad.changeViewOption('noColors', true);
      }

      // If the Monospacefont value is set to true then change it to monospace.
      if (useMonospaceFontGlobal == true)
      {
        pad.changeViewOption('useMonospaceFont', true);
      }
      // if the globalUserName value is set we need to tell the server and the client about the new authorname
      if (globalUserName !== false)
      {
        pad.notifyChangeName(globalUserName); // Notifies the server
	pad.myUserInfo.name = globalUserName;
        $('#myusernameedit').attr({"value":globalUserName}); // Updates the current users UI
      }
    }
    //This handles every Message after the clientVars
    else
    {
      //this message advices the client to disconnect
      if (obj.disconnect)
      {
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
}

var pad = {
  // don't access these directly from outside this file, except
  // for debugging
  collabClient: null,
  myUserInfo: null,
  diagnosticInfo: {},
  initTime: 0,
  clientTimeOffset: null,
  preloadedImages: false,
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
  getIsProPad: function()
  {
    return clientVars.isProPad;
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
  //
  getUserId: function()
  {
    return pad.myUserInfo.userId;
  },
  getUserName: function()
  {
    return pad.myUserInfo.name;
  },
  sendClientMessage: function(msg)
  {
    pad.collabClient.sendClientMessage(msg);
  },

  init: function()
  {
    pad.clientTimeOffset = new Date().getTime() - clientVars.serverTimestamp;
  
    //initialize the chat
    chat.init();
    pad.diagnosticInfo.uniqueId = padutils.uniqueId();
    pad.initTime = +(new Date());
    pad.padOptions = clientVars.initialOptions;

    if ((!$.browser.msie) && (!($.browser.mozilla && $.browser.version.indexOf("1.8.") == 0)))
    {
      document.domain = document.domain; // for comet
    }

    // for IE
    if ($.browser.msie)
    {
      try
      {
        doc.execCommand("BackgroundImageCache", false, true);
      }
      catch (e)
      {}
    }

    // order of inits is important here:
    padcookie.init(clientVars.cookiePrefsToSet);

    $("#widthprefcheck").click(pad.toggleWidthPref);
    $("#sidebarcheck").click(pad.toggleSidebar);

    pad.myUserInfo = {
      userId: clientVars.userId,
      name: clientVars.userName,
      ip: pad.getClientIp(),
      colorId: clientVars.userColor,
      userAgent: pad.getDisplayUserAgent()
    };

    if (clientVars.specialKey)
    {
      pad.myUserInfo.specialKey = clientVars.specialKey;
      if (clientVars.specialKeyTranslation)
      {
        $("#specialkeyarea").html("mode: " + String(clientVars.specialKeyTranslation).toUpperCase());
      }
    }
    paddocbar.init(
    {
      isTitleEditable: pad.getIsProPad(),
      initialTitle: clientVars.initialTitle,
      initialPassword: clientVars.initialPassword,
      guestPolicy: pad.padOptions.guestPolicy
    });
    padimpexp.init();
    padsavedrevs.init(clientVars.initialRevisionList);

    padeditor.init(postAceInit, pad.padOptions.view || {});

    paduserlist.init(pad.myUserInfo);
    //    padchat.init(clientVars.chatHistory, pad.myUserInfo);
    padconnectionstatus.init();
    padmodals.init();

    pad.collabClient = getCollabClient(padeditor.ace, clientVars.collab_client_vars, pad.myUserInfo, {
      colorPalette: pad.getColorPalette()
    });
    pad.collabClient.setOnUserJoin(pad.handleUserJoin);
    pad.collabClient.setOnUpdateUserInfo(pad.handleUserUpdate);
    pad.collabClient.setOnUserLeave(pad.handleUserLeave);
    pad.collabClient.setOnClientMessage(pad.handleClientMessage);
    pad.collabClient.setOnServerMessage(pad.handleServerMessage);
    pad.collabClient.setOnChannelStateChange(pad.handleChannelStateChange);
    pad.collabClient.setOnInternalAction(pad.handleCollabAction);

    function postAceInit()
    {
      padeditbar.init();
      setTimeout(function()
      {
        padeditor.ace.focus();
      }, 0);
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
    //padchat.handleUserJoinOrUpdate(pad.myUserInfo);
  },
  notifyChangeColor: function(newColorId)
  {
    pad.myUserInfo.colorId = newColorId;
    pad.collabClient.updateUserInfo(pad.myUserInfo);
    //padchat.handleUserJoinOrUpdate(pad.myUserInfo);
  },
  notifyChangeTitle: function(newTitle)
  {
    pad.collabClient.sendClientMessage(
    {
      type: 'padtitle',
      title: newTitle,
      changedBy: pad.myUserInfo.name || "unnamed"
    });
  },
  notifyChangePassword: function(newPass)
  {
    pad.collabClient.sendClientMessage(
    {
      type: 'padpassword',
      password: newPass,
      changedBy: pad.myUserInfo.name || "unnamed"
    });
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
    // if the request isn't to hide line numbers then broadcast this to other users
    if (key != "showLineNumbers" && key != "useMonospaceFont")
    {
      pad.collabClient.sendClientMessage(
      {
        type: 'padoptions',
        options: options,
        changedBy: pad.myUserInfo.name || "unnamed"
      });
    }
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
      }
      padeditor.setViewOptions(pad.padOptions.view);
    }
    if (opts.guestPolicy)
    {
      // order important here
      pad.padOptions.guestPolicy = opts.guestPolicy;
      paddocbar.setGuestPolicy(opts.guestPolicy);
    }
  },
  getPadOptions: function()
  {
    // caller shouldn't mutate the object
    return pad.padOptions;
  },
  isPadPublic: function()
  {
    return (!pad.getIsProPad()) || (pad.getPadOptions().guestPolicy == 'allow');
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
    //padchat.handleUserJoinOrUpdate(userInfo);
  },
  handleUserUpdate: function(userInfo)
  {
    paduserlist.userJoinOrUpdate(userInfo);
    //padchat.handleUserJoinOrUpdate(userInfo);
  },
  handleUserLeave: function(userInfo)
  {
    paduserlist.userLeave(userInfo);
    //padchat.handleUserLeave(userInfo);
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
    else if (msg.type == 'chat')
    {
      //padchat.receiveChat(msg);
    }
    else if (msg.type == 'padtitle')
    {
      paddocbar.changeTitle(msg.title);
    }
    else if (msg.type == 'padpassword')
    {
      paddocbar.changePassword(msg.password);
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
  editbarClick: function(cmd)
  {
    if (padeditbar)
    {
      padeditbar.toolbarClick(cmd);
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
          abar.find("#servermsgdate").html(" (" + padutils.simpleDateTime(new Date) + ")");
          abar.find("#servermsgtext").html(m.text);
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
      pad.diagnosticInfo.padInitTime = pad.initTime;
      pad.asyncSendDiagnosticInfo();
      if (typeof window.ajlog == "string")
      {
        window.ajlog += ("Disconnected: " + message + '\n');
      }
      padeditor.disable();
      padeditbar.disable();
      paddocbar.disable();
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
    // load all images referenced from CSS, one at a time,
    // starting one second after connection is first established.
    if (isConnected && !pad.preloadedImages)
    {
      window.setTimeout(function()
      {
        if (!pad.preloadedImages)
        {
          pad.preloadImages();
          pad.preloadedImages = true;
        }
      }, 1000);
    }

    padsavedrevs.handleIsFullyConnected(isConnected);

    pad.determineSidebarVisibility(isConnected && !isInitialConnect);
  },
  determineSidebarVisibility: function(asNowConnectedFeedback)
  {
    if (pad.isFullyConnected())
    {
      var setSidebarVisibility = padutils.getCancellableAction("set-sidebar-visibility", function()
      {
        $("body").toggleClass('hidesidebar', !! padcookie.getPref('hideSidebar'));
      });
      window.setTimeout(setSidebarVisibility, asNowConnectedFeedback ? 3000 : 0);
    }
    else
    {
      padutils.cancelActions("set-sidebar-visibility");
      $("body").removeClass('hidesidebar');
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
    pad.diagnosticInfo.collabDiagnosticInfo = pad.collabClient.getDiagnosticInfo();
    window.setTimeout(function()
    {
      $.ajax(
      {
        type: 'post',
        url: '/ep/pad/connection-diagnostic-info',
        data: {
          padId: pad.getPadId(),
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
  toggleWidthPref: function()
  {
    var newValue = !padcookie.getPref('fullWidth');
    padcookie.setPref('fullWidth', newValue);
    $("#widthprefcheck").toggleClass('widthprefchecked', !! newValue).toggleClass('widthprefunchecked', !newValue);
    pad.handleWidthChange();
  },
  toggleSidebar: function()
  {
    var newValue = !padcookie.getPref('hideSidebar');
    padcookie.setPref('hideSidebar', newValue);
    $("#sidebarcheck").toggleClass('sidebarchecked', !newValue).toggleClass('sidebarunchecked', !! newValue);
    pad.determineSidebarVisibility();
  },
  handleWidthChange: function()
  {
    var isFullWidth = padcookie.getPref('fullWidth');
    if (isFullWidth)
    {
      $("body").addClass('fullwidth').removeClass('limwidth').removeClass('squish1width').removeClass('squish2width');
    }
    else
    {
      $("body").addClass('limwidth').removeClass('fullwidth');

      var pageWidth = $(window).width();
      $("body").toggleClass('squish1width', (pageWidth < 912 && pageWidth > 812)).toggleClass('squish2width', (pageWidth <= 812));
    }
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
  },
  preloadImages: function()
  {
    var images = []; // Removed as we now use CSS and JS for colorpicker

    function loadNextImage()
    {
      if (images.length == 0)
      {
        return;
      }
      var img = new Image();
      img.src = images.shift();
      if (img.complete)
      {
        scheduleLoadNextImage();
      }
      else
      {
        $(img).bind('error load onreadystatechange', scheduleLoadNextImage);
      }
    }

    function scheduleLoadNextImage()
    {
      window.setTimeout(loadNextImage, 0);
    }
    scheduleLoadNextImage();
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
