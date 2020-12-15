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

const chat = require('./chat').chat;
const hooks = require('./pluginfw/hooks');

// Dependency fill on init. This exists for `pad.socket` only.
// TODO: bind directly to the socket.
let pad = undefined;
function getSocket() {
  return pad && pad.socket;
}

/** Call this when the document is ready, and a new Ace2Editor() has been created and inited.
    ACE's ready callback does not need to have fired yet.
    "serverVars" are from calling doc.getCollabClientVars() on the server. */
function getCollabClient(ace2editor, serverVars, initialUserInfo, options, _pad) {
  const editor = ace2editor;
  pad = _pad; // Inject pad to avoid a circular dependency.

  let rev = serverVars.rev;
  const padId = serverVars.padId;

  let state = 'IDLE';
  let stateMessage;
  let channelState = 'CONNECTING';
  let appLevelDisconnectReason = null;

  let lastCommitTime = 0;
  let initialStartConnectTime = 0;

  const userId = initialUserInfo.userId;
  // var socket;
  const userSet = {}; // userId -> userInfo
  userSet[userId] = initialUserInfo;

  const caughtErrors = [];
  const caughtErrorCatchers = [];
  const caughtErrorTimes = [];
  const debugMessages = [];
  const msgQueue = [];

  let isPendingRevision = false;

  tellAceAboutHistoricalAuthors(serverVars.historicalAuthorData);
  tellAceActiveAuthorInfo(initialUserInfo);

  const callbacks = {
    onUserJoin() {},
    onUserLeave() {},
    onUpdateUserInfo() {},
    onChannelStateChange() {},
    onClientMessage() {},
    onInternalAction() {},
    onConnectionTrouble() {},
    onServerMessage() {},
  };
  if (browser.firefox) {
    // Prevent "escape" from taking effect and canceling a comet connection;
    // doesn't work if focus is on an iframe.
    $(window).bind('keydown', (evt) => {
      if (evt.which == 27) {
        evt.preventDefault();
      }
    });
  }

  editor.setProperty('userAuthor', userId);
  editor.setBaseAttributedText(serverVars.initialAttributedText, serverVars.apool);
  editor.setUserChangeNotificationCallback(wrapRecordingErrors('handleUserChanges', handleUserChanges));

  function dmesg(str) {
    if (typeof window.ajlog === 'string') window.ajlog += `${str}\n`;
    debugMessages.push(str);
  }

  function handleUserChanges() {
    if (editor.getInInternationalComposition()) return;
    if ((!getSocket()) || channelState == 'CONNECTING') {
      if (channelState == 'CONNECTING' && (((+new Date()) - initialStartConnectTime) > 20000)) {
        setChannelState('DISCONNECTED', 'initsocketfail');
      } else {
        // check again in a bit
        setTimeout(wrapRecordingErrors('setTimeout(handleUserChanges)', handleUserChanges), 1000);
      }
      return;
    }

    const t = (+new Date());

    if (state != 'IDLE') {
      if (state == 'COMMITTING' && msgQueue.length == 0 && (t - lastCommitTime) > 20000) {
        // a commit is taking too long
        setChannelState('DISCONNECTED', 'slowcommit');
      } else if (state == 'COMMITTING' && msgQueue.length == 0 && (t - lastCommitTime) > 5000) {
        callbacks.onConnectionTrouble('SLOW');
      } else {
        // run again in a few seconds, to detect a disconnect
        setTimeout(wrapRecordingErrors('setTimeout(handleUserChanges)', handleUserChanges), 3000);
      }
      return;
    }

    const earliestCommit = lastCommitTime + 500;
    if (t < earliestCommit) {
      setTimeout(wrapRecordingErrors('setTimeout(handleUserChanges)', handleUserChanges), earliestCommit - t);
      return;
    }

    // apply msgQueue changeset.
    if (msgQueue.length != 0) {
      let msg;
      while (msg = msgQueue.shift()) {
        const newRev = msg.newRev;
        rev = newRev;
        if (msg.type == 'ACCEPT_COMMIT') {
          editor.applyPreparedChangesetToBase();
          setStateIdle();
          callCatchingErrors('onInternalAction', () => {
            callbacks.onInternalAction('commitAcceptedByServer');
          });
          callCatchingErrors('onConnectionTrouble', () => {
            callbacks.onConnectionTrouble('OK');
          });
          handleUserChanges();
        } else if (msg.type == 'NEW_CHANGES') {
          const changeset = msg.changeset;
          const author = (msg.author || '');
          const apool = msg.apool;

          editor.applyChangesToBase(changeset, author, apool);
        }
      }
      if (isPendingRevision) {
        setIsPendingRevision(false);
      }
    }

    let sentMessage = false;
    // Check if there are any pending revisions to be received from server.
    // Allow only if there are no pending revisions to be received from server
    if (!isPendingRevision) {
      const userChangesData = editor.prepareUserChangeset();
      if (userChangesData.changeset) {
        lastCommitTime = t;
        state = 'COMMITTING';
        stateMessage = {
          type: 'USER_CHANGES',
          baseRev: rev,
          changeset: userChangesData.changeset,
          apool: userChangesData.apool,
        };
        sendMessage(stateMessage);
        sentMessage = true;
        callbacks.onInternalAction('commitPerformed');
      }
    } else {
      // run again in a few seconds, to check if there was a reconnection attempt
      setTimeout(wrapRecordingErrors('setTimeout(handleUserChanges)', handleUserChanges), 3000);
    }

    if (sentMessage) {
      // run again in a few seconds, to detect a disconnect
      setTimeout(wrapRecordingErrors('setTimeout(handleUserChanges)', handleUserChanges), 3000);
    }
  }

  function setUpSocket() {
    hiccupCount = 0;
    setChannelState('CONNECTED');
    doDeferredActions();

    initialStartConnectTime = +new Date();
  }

  var hiccupCount = 0;

  function sendMessage(msg) {
    getSocket().json.send(
        {
          type: 'COLLABROOM',
          component: 'pad',
          data: msg,
        });
  }

  function wrapRecordingErrors(catcher, func) {
    return function () {
      try {
        return func.apply(this, Array.prototype.slice.call(arguments));
      } catch (e) {
        caughtErrors.push(e);
        caughtErrorCatchers.push(catcher);
        caughtErrorTimes.push(+new Date());
        // console.dir({catcher: catcher, e: e});
        throw e;
      }
    };
  }

  function callCatchingErrors(catcher, func) {
    try {
      wrapRecordingErrors(catcher, func)();
    } catch (e) { /* absorb*/
    }
  }

  function handleMessageFromServer(evt) {
    if (!getSocket()) return;
    if (!evt.data) return;
    const wrapper = evt;
    if (wrapper.type != 'COLLABROOM' && wrapper.type != 'CUSTOM') return;
    const msg = wrapper.data;

    if (msg.type == 'NEW_CHANGES') {
      var newRev = msg.newRev;
      var changeset = msg.changeset;
      var author = (msg.author || '');
      var apool = msg.apool;

      // When inInternationalComposition, msg pushed msgQueue.
      if (msgQueue.length > 0 || editor.getInInternationalComposition()) {
        if (msgQueue.length > 0) var oldRev = msgQueue[msgQueue.length - 1].newRev;
        else oldRev = rev;

        if (newRev != (oldRev + 1)) {
          window.console.warn(`bad message revision on NEW_CHANGES: ${newRev} not ${oldRev + 1}`);
          // setChannelState("DISCONNECTED", "badmessage_newchanges");
          return;
        }
        msgQueue.push(msg);
        return;
      }

      if (newRev != (rev + 1)) {
        window.console.warn(`bad message revision on NEW_CHANGES: ${newRev} not ${rev + 1}`);
        // setChannelState("DISCONNECTED", "badmessage_newchanges");
        return;
      }
      rev = newRev;

      editor.applyChangesToBase(changeset, author, apool);
    } else if (msg.type == 'ACCEPT_COMMIT') {
      var newRev = msg.newRev;
      if (msgQueue.length > 0) {
        if (newRev != (msgQueue[msgQueue.length - 1].newRev + 1)) {
          window.console.warn(`bad message revision on ACCEPT_COMMIT: ${newRev} not ${msgQueue[msgQueue.length - 1][0] + 1}`);
          // setChannelState("DISCONNECTED", "badmessage_acceptcommit");
          return;
        }
        msgQueue.push(msg);
        return;
      }

      if (newRev != (rev + 1)) {
        window.console.warn(`bad message revision on ACCEPT_COMMIT: ${newRev} not ${rev + 1}`);
        // setChannelState("DISCONNECTED", "badmessage_acceptcommit");
        return;
      }
      rev = newRev;
      editor.applyPreparedChangesetToBase();
      setStateIdle();
      callCatchingErrors('onInternalAction', () => {
        callbacks.onInternalAction('commitAcceptedByServer');
      });
      callCatchingErrors('onConnectionTrouble', () => {
        callbacks.onConnectionTrouble('OK');
      });
      handleUserChanges();
    } else if (msg.type == 'CLIENT_RECONNECT') {
      // Server sends a CLIENT_RECONNECT message when there is a client reconnect. Server also returns
      // all pending revisions along with this CLIENT_RECONNECT message
      if (msg.noChanges) {
        // If no revisions are pending, just make everything normal
        setIsPendingRevision(false);
        return;
      }

      const headRev = msg.headRev;
      var newRev = msg.newRev;
      var changeset = msg.changeset;
      var author = (msg.author || '');
      var apool = msg.apool;

      if (msgQueue.length > 0) {
        if (newRev != (msgQueue[msgQueue.length - 1].newRev + 1)) {
          window.console.warn(`bad message revision on CLIENT_RECONNECT: ${newRev} not ${msgQueue[msgQueue.length - 1][0] + 1}`);
          // setChannelState("DISCONNECTED", "badmessage_acceptcommit");
          return;
        }
        msg.type = 'NEW_CHANGES';
        msgQueue.push(msg);
        return;
      }

      if (newRev != (rev + 1)) {
        window.console.warn(`bad message revision on CLIENT_RECONNECT: ${newRev} not ${rev + 1}`);
        // setChannelState("DISCONNECTED", "badmessage_acceptcommit");
        return;
      }

      rev = newRev;
      if (author == pad.getUserId()) {
        editor.applyPreparedChangesetToBase();
        setStateIdle();
        callCatchingErrors('onInternalAction', () => {
          callbacks.onInternalAction('commitAcceptedByServer');
        });
        callCatchingErrors('onConnectionTrouble', () => {
          callbacks.onConnectionTrouble('OK');
        });
        handleUserChanges();
      } else {
        editor.applyChangesToBase(changeset, author, apool);
      }

      if (newRev == headRev) {
        // Once we have applied all pending revisions, make everything normal
        setIsPendingRevision(false);
      }
    } else if (msg.type == 'NO_COMMIT_PENDING') {
      if (state == 'COMMITTING') {
        // server missed our commit message; abort that commit
        setStateIdle();
        handleUserChanges();
      }
    } else if (msg.type == 'USER_NEWINFO') {
      var userInfo = msg.userInfo;
      var id = userInfo.userId;

      // Avoid a race condition when setting colors.  If our color was set by a
      // query param, ignore our own "new user" message's color value.
      if (id === initialUserInfo.userId && initialUserInfo.globalUserColor) {
        msg.userInfo.colorId = initialUserInfo.globalUserColor;
      }


      if (userSet[id]) {
        userSet[id] = userInfo;
        callbacks.onUpdateUserInfo(userInfo);
      } else {
        userSet[id] = userInfo;
        callbacks.onUserJoin(userInfo);
      }
      tellAceActiveAuthorInfo(userInfo);
    } else if (msg.type == 'USER_LEAVE') {
      var userInfo = msg.userInfo;
      var id = userInfo.userId;
      if (userSet[id]) {
        delete userSet[userInfo.userId];
        fadeAceAuthorInfo(userInfo);
        callbacks.onUserLeave(userInfo);
      }
    } else if (msg.type == 'DISCONNECT_REASON') {
      appLevelDisconnectReason = msg.reason;
    } else if (msg.type == 'CLIENT_MESSAGE') {
      callbacks.onClientMessage(msg.payload);
    } else if (msg.type == 'CHAT_MESSAGE') {
      chat.addMessage(msg, true, false);
    } else if (msg.type == 'CHAT_MESSAGES') {
      for (let i = msg.messages.length - 1; i >= 0; i--) {
        chat.addMessage(msg.messages[i], true, true);
      }
      if (!chat.gotInitalMessages) {
        chat.scrollDown();
        chat.gotInitalMessages = true;
        chat.historyPointer = clientVars.chatHead - msg.messages.length;
      }

      // messages are loaded, so hide the loading-ball
      $('#chatloadmessagesball').css('display', 'none');

      // there are less than 100 messages or we reached the top
      if (chat.historyPointer <= 0) { $('#chatloadmessagesbutton').css('display', 'none'); } else // there are still more messages, re-show the load-button
      { $('#chatloadmessagesbutton').css('display', 'block'); }
    } else if (msg.type == 'SERVER_MESSAGE') {
      callbacks.onServerMessage(msg.payload);
    }

    // HACKISH: User messages do not have "payload" but "userInfo", so that all "handleClientMessage_USER_" hooks would work, populate payload
    // FIXME: USER_* messages to have "payload" property instead of "userInfo", seems like a quite a big work
    if (msg.type.indexOf('USER_') > -1) {
      msg.payload = msg.userInfo;
    }
    // Similar for NEW_CHANGES
    if (msg.type === 'NEW_CHANGES') msg.payload = msg;

    hooks.callAll(`handleClientMessage_${msg.type}`, {payload: msg.payload});
  }

  function updateUserInfo(userInfo) {
    userInfo.userId = userId;
    userSet[userId] = userInfo;
    tellAceActiveAuthorInfo(userInfo);
    if (!getSocket()) return;
    sendMessage(
        {
          type: 'USERINFO_UPDATE',
          userInfo,
        });
  }

  function tellAceActiveAuthorInfo(userInfo) {
    tellAceAuthorInfo(userInfo.userId, userInfo.colorId);
  }

  function tellAceAuthorInfo(userId, colorId, inactive) {
    if (typeof colorId === 'number') {
      colorId = clientVars.colorPalette[colorId];
    }

    const cssColor = colorId;
    if (inactive) {
      editor.setAuthorInfo(userId, {
        bgcolor: cssColor,
        fade: 0.5,
      });
    } else {
      editor.setAuthorInfo(userId, {
        bgcolor: cssColor,
      });
    }
  }

  function fadeAceAuthorInfo(userInfo) {
    tellAceAuthorInfo(userInfo.userId, userInfo.colorId, true);
  }

  function getConnectedUsers() {
    return valuesArray(userSet);
  }

  function tellAceAboutHistoricalAuthors(hadata) {
    for (const author in hadata) {
      const data = hadata[author];
      if (!userSet[author]) {
        tellAceAuthorInfo(author, data.colorId, true);
      }
    }
  }

  function setChannelState(newChannelState, moreInfo) {
    if (newChannelState != channelState) {
      channelState = newChannelState;
      callbacks.onChannelStateChange(channelState, moreInfo);
    }
  }

  function valuesArray(obj) {
    const array = [];
    $.each(obj, (k, v) => {
      array.push(v);
    });
    return array;
  }

  // We need to present a working interface even before the socket
  // is connected for the first time.
  let deferredActions = [];

  function defer(func, tag) {
    return function () {
      const that = this;
      const args = arguments;

      function action() {
        func.apply(that, args);
      }
      action.tag = tag;
      if (channelState == 'CONNECTING') {
        deferredActions.push(action);
      } else {
        action();
      }
    };
  }

  function doDeferredActions(tag) {
    const newArray = [];
    for (let i = 0; i < deferredActions.length; i++) {
      const a = deferredActions[i];
      if ((!tag) || (tag == a.tag)) {
        a();
      } else {
        newArray.push(a);
      }
    }
    deferredActions = newArray;
  }

  function sendClientMessage(msg) {
    sendMessage(
        {
          type: 'CLIENT_MESSAGE',
          payload: msg,
        });
  }

  function getCurrentRevisionNumber() {
    return rev;
  }

  function getMissedChanges() {
    const obj = {};
    obj.userInfo = userSet[userId];
    obj.baseRev = rev;
    if (state == 'COMMITTING' && stateMessage) {
      obj.committedChangeset = stateMessage.changeset;
      obj.committedChangesetAPool = stateMessage.apool;
      editor.applyPreparedChangesetToBase();
    }
    const userChangesData = editor.prepareUserChangeset();
    if (userChangesData.changeset) {
      obj.furtherChangeset = userChangesData.changeset;
      obj.furtherChangesetAPool = userChangesData.apool;
    }
    return obj;
  }

  function setStateIdle() {
    state = 'IDLE';
    callbacks.onInternalAction('newlyIdle');
    schedulePerhapsCallIdleFuncs();
  }

  function setIsPendingRevision(value) {
    isPendingRevision = value;
  }

  function callWhenNotCommitting(func) {
    idleFuncs.push(func);
    schedulePerhapsCallIdleFuncs();
  }

  var idleFuncs = [];

  function schedulePerhapsCallIdleFuncs() {
    setTimeout(() => {
      if (state == 'IDLE') {
        while (idleFuncs.length > 0) {
          const f = idleFuncs.shift();
          f();
        }
      }
    }, 0);
  }

  const self = {
    setOnUserJoin(cb) {
      callbacks.onUserJoin = cb;
    },
    setOnUserLeave(cb) {
      callbacks.onUserLeave = cb;
    },
    setOnUpdateUserInfo(cb) {
      callbacks.onUpdateUserInfo = cb;
    },
    setOnChannelStateChange(cb) {
      callbacks.onChannelStateChange = cb;
    },
    setOnClientMessage(cb) {
      callbacks.onClientMessage = cb;
    },
    setOnInternalAction(cb) {
      callbacks.onInternalAction = cb;
    },
    setOnConnectionTrouble(cb) {
      callbacks.onConnectionTrouble = cb;
    },
    setOnServerMessage(cb) {
      callbacks.onServerMessage = cb;
    },
    updateUserInfo: defer(updateUserInfo),
    handleMessageFromServer,
    getConnectedUsers,
    sendClientMessage,
    sendMessage,
    getCurrentRevisionNumber,
    getMissedChanges,
    callWhenNotCommitting,
    addHistoricalAuthors: tellAceAboutHistoricalAuthors,
    setChannelState,
    setStateIdle,
    setIsPendingRevision,
  };

  setUpSocket();
  return self;
}

exports.getCollabClient = getCollabClient;
