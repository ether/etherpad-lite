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

var chat = require('/chat').chat;

// Dependency fill on init. This exists for `pad.socket` only.
// TODO: bind directly to the socket.
var pad = undefined;
function getSocket() {
  return pad && pad.socket;
}

/** Call this when the document is ready, and a new Ace2Editor() has been created and inited.
    ACE's ready callback does not need to have fired yet.
    "serverVars" are from calling doc.getCollabClientVars() on the server. */
function getCollabClient(ace2editor, serverVars, initialUserInfo, options, _pad)
{
  var editor = ace2editor;
  pad = _pad; // Inject pad to avoid a circular dependency.

  var rev = serverVars.rev;
  var padId = serverVars.padId;
  var globalPadId = serverVars.globalPadId;

  var state = "IDLE";
  var stateMessage;
  var stateMessageSocketId;
  var channelState = "CONNECTING";
  var appLevelDisconnectReason = null;

  var lastCommitTime = 0;
  var initialStartConnectTime = 0;

  var userId = initialUserInfo.userId;
  var socketId;
  //var socket;
  var userSet = {}; // userId -> userInfo
  userSet[userId] = initialUserInfo;

  var reconnectTimes = [];
  var caughtErrors = [];
  var caughtErrorCatchers = [];
  var caughtErrorTimes = [];
  var debugMessages = [];

  tellAceAboutHistoricalAuthors(serverVars.historicalAuthorData);
  tellAceActiveAuthorInfo(initialUserInfo);

  var callbacks = {
    onUserJoin: function()
    {},
    onUserLeave: function()
    {},
    onUpdateUserInfo: function()
    {},
    onChannelStateChange: function()
    {},
    onClientMessage: function()
    {},
    onInternalAction: function()
    {},
    onConnectionTrouble: function()
    {},
    onServerMessage: function()
    {}
  };

  if ($.browser.mozilla)
  {
    // Prevent "escape" from taking effect and canceling a comet connection;
    // doesn't work if focus is on an iframe.
    $(window).bind("keydown", function(evt)
    {
      if (evt.which == 27)
      {
        evt.preventDefault()
      }
    });
  }

  editor.setProperty("userAuthor", userId);
  editor.setBaseAttributedText(serverVars.initialAttributedText, serverVars.apool);
  editor.setUserChangeNotificationCallback(wrapRecordingErrors("handleUserChanges", handleUserChanges));

  function dmesg(str)
  {
    if (typeof window.ajlog == "string") window.ajlog += str + '\n';
    debugMessages.push(str);
  }

  function handleUserChanges()
  {
    if ((!getSocket()) || channelState == "CONNECTING")
    {
      if (channelState == "CONNECTING" && (((+new Date()) - initialStartConnectTime) > 20000))
      {
        setChannelState("DISCONNECTED", "initsocketfail");
      }
      else
      {
        // check again in a bit
        setTimeout(wrapRecordingErrors("setTimeout(handleUserChanges)", handleUserChanges), 1000);
      }
      return;
    }

    var t = (+new Date());

    if (state != "IDLE")
    {
      if (state == "COMMITTING" && (t - lastCommitTime) > 20000)
      {
        // a commit is taking too long
        setChannelState("DISCONNECTED", "slowcommit");
      }
      else if (state == "COMMITTING" && (t - lastCommitTime) > 5000)
      {
        callbacks.onConnectionTrouble("SLOW");
      }
      else
      {
        // run again in a few seconds, to detect a disconnect
        setTimeout(wrapRecordingErrors("setTimeout(handleUserChanges)", handleUserChanges), 3000);
      }
      return;
    }

    var earliestCommit = lastCommitTime + 500;
    if (t < earliestCommit)
    {
      setTimeout(wrapRecordingErrors("setTimeout(handleUserChanges)", handleUserChanges), earliestCommit - t);
      return;
    }

    var sentMessage = false;
    var userChangesData = editor.prepareUserChangeset();
    if (userChangesData.changeset)
    {
      lastCommitTime = t;
      state = "COMMITTING";
      stateMessage = {
        type: "USER_CHANGES",
        baseRev: rev,
        changeset: userChangesData.changeset,
        apool: userChangesData.apool
      };
      stateMessageSocketId = socketId;
      sendMessage(stateMessage);
      sentMessage = true;
      callbacks.onInternalAction("commitPerformed");
    }

    if (sentMessage)
    {
      // run again in a few seconds, to detect a disconnect
      setTimeout(wrapRecordingErrors("setTimeout(handleUserChanges)", handleUserChanges), 3000);
    }
  }

  function getStats()
  {
    var stats = {};

    stats.screen = [$(window).width(), $(window).height(), window.screen.availWidth, window.screen.availHeight, window.screen.width, window.screen.height].join(',');
    stats.ip = serverVars.clientIp;
    stats.useragent = serverVars.clientAgent;

    return stats;
  }

  function setUpSocket()
  {
    //oldSocketId = String(Math.floor(Math.random()*1e12));
    //socketId = String(Math.floor(Math.random()*1e12));
/*socket = new io.Socket();
    socket.connect();*/

    //socket.on('connect', function(){
    hiccupCount = 0;
    setChannelState("CONNECTED");
/*var msg = { type:"CLIENT_READY", roomType:'padpage',
                  roomName:'padpage/'+globalPadId,
                  data: {
                    lastRev:rev,
                    userInfo:userSet[userId],
                    stats: getStats() } };
      if (oldSocketId) {
        msg.data.isReconnectOf = oldSocketId;
        msg.data.isCommitPending = (state == "COMMITTING");
      }
      sendMessage(msg);*/
    doDeferredActions();

    initialStartConnectTime = +new Date();
    // });
/*socket.on('message', function(obj){
      if(window.console)
        console.log(obj);
      handleMessageFromServer(obj);
    });*/

/*var success = false;
    callCatchingErrors("setUpSocket", function() {
      appLevelDisconnectReason = null;

      var oldSocketId = socketId;
      socketId = String(Math.floor(Math.random()*1e12));
      socket = new WebSocket(socketId);
      socket.onmessage = wrapRecordingErrors("socket.onmessage", handleMessageFromServer);
      socket.onclosed = wrapRecordingErrors("socket.onclosed", handleSocketClosed);
      socket.onopen = wrapRecordingErrors("socket.onopen", function() {
        hiccupCount = 0;
        setChannelState("CONNECTED");
        var msg = { type:"CLIENT_READY", roomType:'padpage',
                    roomName:'padpage/'+globalPadId,
                    data: {
                      lastRev:rev,
                      userInfo:userSet[userId],
                      stats: getStats() } };
        if (oldSocketId) {
          msg.data.isReconnectOf = oldSocketId;
          msg.data.isCommitPending = (state == "COMMITTING");
        }
        sendMessage(msg);
        doDeferredActions();
      });
      socket.onhiccup = wrapRecordingErrors("socket.onhiccup", handleCometHiccup);
      socket.onlogmessage = dmesg;
      socket.connect();
      success = true;
    });
    if (success) {
      initialStartConnectTime = +new Date();
    }
    else {
      abandonConnection("initsocketfail");
    }*/
  }

  var hiccupCount = 0;

  function handleCometHiccup(params)
  {
    dmesg("HICCUP (connected:" + ( !! params.connected) + ")");
    var connectedNow = params.connected;
    if (!connectedNow)
    {
      hiccupCount++;
      // skip first "cut off from server" notification
      if (hiccupCount > 1)
      {
        setChannelState("RECONNECTING");
      }
    }
    else
    {
      hiccupCount = 0;
      setChannelState("CONNECTED");
    }
  }

  function sendMessage(msg)
  {
    getSocket().json.send(
    {
      type: "COLLABROOM",
      component: "pad",
      data: msg
    });
  }

  function wrapRecordingErrors(catcher, func)
  {
    return function()
    {
      try
      {
        return func.apply(this, Array.prototype.slice.call(arguments));
      }
      catch (e)
      {
        caughtErrors.push(e);
        caughtErrorCatchers.push(catcher);
        caughtErrorTimes.push(+new Date());
        //console.dir({catcher: catcher, e: e});
        throw e;
      }
    };
  }

  function callCatchingErrors(catcher, func)
  {
    try
    {
      wrapRecordingErrors(catcher, func)();
    }
    catch (e)
    { /*absorb*/
    }
  }

  function handleMessageFromServer(evt)
  {
    if (window.console) console.log(evt);

    if (!getSocket()) return;
    if (!evt.data) return;
    var wrapper = evt;
    if (wrapper.type != "COLLABROOM") return;
    var msg = wrapper.data;
    if (msg.type == "NEW_CHANGES")
    {
      var newRev = msg.newRev;
      var changeset = msg.changeset;
      var author = (msg.author || '');
      var apool = msg.apool;
      if (newRev != (rev + 1))
      {
        dmesg("bad message revision on NEW_CHANGES: " + newRev + " not " + (rev + 1));
        setChannelState("DISCONNECTED", "badmessage_newchanges");
        return;
      }
      rev = newRev;
      editor.applyChangesToBase(changeset, author, apool);
    }
    else if (msg.type == "ACCEPT_COMMIT")
    {
      var newRev = msg.newRev;
      if (newRev != (rev + 1))
      {
        dmesg("bad message revision on ACCEPT_COMMIT: " + newRev + " not " + (rev + 1));
        setChannelState("DISCONNECTED", "badmessage_acceptcommit");
        return;
      }
      rev = newRev;
      editor.applyPreparedChangesetToBase();
      setStateIdle();
      callCatchingErrors("onInternalAction", function()
      {
        callbacks.onInternalAction("commitAcceptedByServer");
      });
      callCatchingErrors("onConnectionTrouble", function()
      {
        callbacks.onConnectionTrouble("OK");
      });
      handleUserChanges();
    }
    else if (msg.type == "NO_COMMIT_PENDING")
    {
      if (state == "COMMITTING")
      {
        // server missed our commit message; abort that commit
        setStateIdle();
        handleUserChanges();
      }
    }
    else if (msg.type == "USER_NEWINFO")
    {
      var userInfo = msg.userInfo;
      var id = userInfo.userId;
      
      if (userSet[id])
      {
        userSet[id] = userInfo;
        callbacks.onUpdateUserInfo(userInfo);
        dmesgUsers();
      }
      else
      {
        userSet[id] = userInfo;
        callbacks.onUserJoin(userInfo);
        dmesgUsers();
      }
      tellAceActiveAuthorInfo(userInfo);
    }
    else if (msg.type == "USER_LEAVE")
    {
      var userInfo = msg.userInfo;
      var id = userInfo.userId;
      if (userSet[id])
      {
        delete userSet[userInfo.userId];
        fadeAceAuthorInfo(userInfo);
        callbacks.onUserLeave(userInfo);
        dmesgUsers();
      }
    }
    else if (msg.type == "DISCONNECT_REASON")
    {
      appLevelDisconnectReason = msg.reason;
    }
    else if (msg.type == "CLIENT_MESSAGE")
    {
      callbacks.onClientMessage(msg.payload);
    }
    else if (msg.type == "CHAT_MESSAGE")
    {
      chat.addMessage(msg, true);
    }
    else if (msg.type == "SERVER_MESSAGE")
    {
      callbacks.onServerMessage(msg.payload);
    }
  }

  function updateUserInfo(userInfo)
  {
    userInfo.userId = userId;
    userSet[userId] = userInfo;
    tellAceActiveAuthorInfo(userInfo);
    if (!getSocket()) return;
    sendMessage(
    {
      type: "USERINFO_UPDATE",
      userInfo: userInfo
    });
  }

  function tellAceActiveAuthorInfo(userInfo)
  {
    tellAceAuthorInfo(userInfo.userId, userInfo.colorId);
  }

  function tellAceAuthorInfo(userId, colorId, inactive)
  {
    if(typeof colorId == "number")
    {
      colorId = clientVars.colorPalette[colorId];
    }
    
    var cssColor = colorId;
    if (inactive)
    {
      editor.setAuthorInfo(userId, {
        bgcolor: cssColor,
        fade: 0.5
      });
    }
    else
    {
      editor.setAuthorInfo(userId, {
        bgcolor: cssColor
      });
    }
  }

  function fadeAceAuthorInfo(userInfo)
  {
    tellAceAuthorInfo(userInfo.userId, userInfo.colorId, true);
  }

  function getConnectedUsers()
  {
    return valuesArray(userSet);
  }

  function tellAceAboutHistoricalAuthors(hadata)
  {
    for (var author in hadata)
    {
      var data = hadata[author];
      if (!userSet[author])
      {
        tellAceAuthorInfo(author, data.colorId, true);
      }
    }
  }

  function dmesgUsers()
  {
    //pad.dmesg($.map(getConnectedUsers(), function(u) { return u.userId.slice(-2); }).join(','));
  }

  function setChannelState(newChannelState, moreInfo)
  {
    if (newChannelState != channelState)
    {
      channelState = newChannelState;
      callbacks.onChannelStateChange(channelState, moreInfo);
    }
  }

  function keys(obj)
  {
    var array = [];
    $.each(obj, function(k, v)
    {
      array.push(k);
    });
    return array;
  }

  function valuesArray(obj)
  {
    var array = [];
    $.each(obj, function(k, v)
    {
      array.push(v);
    });
    return array;
  }

  // We need to present a working interface even before the socket
  // is connected for the first time.
  var deferredActions = [];

  function defer(func, tag)
  {
    return function()
    {
      var that = this;
      var args = arguments;

      function action()
      {
        func.apply(that, args);
      }
      action.tag = tag;
      if (channelState == "CONNECTING")
      {
        deferredActions.push(action);
      }
      else
      {
        action();
      }
    }
  }

  function doDeferredActions(tag)
  {
    var newArray = [];
    for (var i = 0; i < deferredActions.length; i++)
    {
      var a = deferredActions[i];
      if ((!tag) || (tag == a.tag))
      {
        a();
      }
      else
      {
        newArray.push(a);
      }
    }
    deferredActions = newArray;
  }

  function sendClientMessage(msg)
  {
    sendMessage(
    {
      type: "CLIENT_MESSAGE",
      payload: msg
    });
  }

  function getCurrentRevisionNumber()
  {
    return rev;
  }

  function getMissedChanges()
  {
    var obj = {};
    obj.userInfo = userSet[userId];
    obj.baseRev = rev;
    if (state == "COMMITTING" && stateMessage)
    {
      obj.committedChangeset = stateMessage.changeset;
      obj.committedChangesetAPool = stateMessage.apool;
      obj.committedChangesetSocketId = stateMessageSocketId;
      editor.applyPreparedChangesetToBase();
    }
    var userChangesData = editor.prepareUserChangeset();
    if (userChangesData.changeset)
    {
      obj.furtherChangeset = userChangesData.changeset;
      obj.furtherChangesetAPool = userChangesData.apool;
    }
    return obj;
  }

  function setStateIdle()
  {
    state = "IDLE";
    callbacks.onInternalAction("newlyIdle");
    schedulePerhapsCallIdleFuncs();
  }

  function callWhenNotCommitting(func)
  {
    idleFuncs.push(func);
    schedulePerhapsCallIdleFuncs();
  }

  var idleFuncs = [];

  function schedulePerhapsCallIdleFuncs()
  {
    setTimeout(function()
    {
      if (state == "IDLE")
      {
        while (idleFuncs.length > 0)
        {
          var f = idleFuncs.shift();
          f();
        }
      }
    }, 0);
  }

  var self = {
    setOnUserJoin: function(cb)
    {
      callbacks.onUserJoin = cb;
    },
    setOnUserLeave: function(cb)
    {
      callbacks.onUserLeave = cb;
    },
    setOnUpdateUserInfo: function(cb)
    {
      callbacks.onUpdateUserInfo = cb;
    },
    setOnChannelStateChange: function(cb)
    {
      callbacks.onChannelStateChange = cb;
    },
    setOnClientMessage: function(cb)
    {
      callbacks.onClientMessage = cb;
    },
    setOnInternalAction: function(cb)
    {
      callbacks.onInternalAction = cb;
    },
    setOnConnectionTrouble: function(cb)
    {
      callbacks.onConnectionTrouble = cb;
    },
    setOnServerMessage: function(cb)
    {
      callbacks.onServerMessage = cb;
    },
    updateUserInfo: defer(updateUserInfo),
    handleMessageFromServer: handleMessageFromServer,
    getConnectedUsers: getConnectedUsers,
    sendClientMessage: sendClientMessage,
    sendMessage: sendMessage,
    getCurrentRevisionNumber: getCurrentRevisionNumber,
    getMissedChanges: getMissedChanges,
    callWhenNotCommitting: callWhenNotCommitting,
    addHistoricalAuthors: tellAceAboutHistoricalAuthors,
    setChannelState: setChannelState
  };

  $(document).ready(setUpSocket);
  return self;
}

function selectElementContents(elem)
{
  if ($.browser.msie)
  {
    var range = document.body.createTextRange();
    range.moveToElementText(elem);
    range.select();
  }
  else
  {
    if (window.getSelection)
    {
      var browserSelection = window.getSelection();
      if (browserSelection)
      {
        var range = document.createRange();
        range.selectNodeContents(elem);
        browserSelection.removeAllRanges();
        browserSelection.addRange(range);
      }
    }
  }
}

exports.getCollabClient = getCollabClient;
exports.selectElementContents = selectElementContents;
