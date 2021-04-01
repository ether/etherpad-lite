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

const chat = require('./chat').chat;
const hooks = require('./pluginfw/hooks');
const browser = require('./vendors/browser');

// Gate is a normal Promise that resolves when its open() method is called.
class Gate extends Promise {
  constructor(executor = null) {
    let open;
    super((resolve, reject) => {
      open = resolve;
      if (executor != null) executor(resolve, reject);
    });
    this.open = open;
  }
}

class TaskQueue {
  constructor() {
    this._promiseChain = Promise.resolve();
  }

  async enqueue(fn) {
    const taskPromise = this._promiseChain.then(fn);
    // Use .catch() to prevent rejections from halting the queue.
    this._promiseChain = taskPromise.catch(() => {});
    // Do NOT do `return await this._promiseChain;` because the caller would not see an error if
    // fn() throws/rejects (due to the .catch() added above).
    return await taskPromise;
  }
}

class CollabClient {
  constructor(ace2editor, serverVars, initialUserInfo, pad) {
    this.commitDelay = 500; // public so that tests can be sped up

    this._editor = ace2editor;
    this._initialUserInfo = initialUserInfo;
    this._pad = pad;

    this._rev = serverVars.rev;
    this._committing = false;
    this._stateMessage;
    this._channelState = 'CONNECTING';
    this._lastCommitTime = 0;
    this._startConnectTime = Date.now();

    this._userId = this._initialUserInfo.userId;
    this._userSet = {}; // userId -> userInfo
    this._userSet[this._userId] = this._initialUserInfo;

    this._isPendingRevision = false;

    this._callbacks = {
      onUserJoin: () => {},
      onUserLeave: () => {},
      onUpdateUserInfo: () => {},
      onChannelStateChange: () => {},
      onClientMessage: () => {},
      onInternalAction: () => {},
      onConnectionTrouble: () => {},
      onServerMessage: () => {},
    };

    // We need to present a working interface even before the socket is connected for the first
    // time. Use a Gate to block actions until connected. Once connected, the Gate is opened which
    // causes post-connect actions to start running.
    this._connectedGate = new Gate();

    if (browser.firefox) {
      // Prevent "escape" from taking effect and canceling a comet connection;
      // doesn't work if focus is on an iframe.
      $(window).bind('keydown', (evt) => {
        if (evt.which === 27) {
          evt.preventDefault();
        }
      });
    }

    this._serverMessageTaskQueue = new TaskQueue();

    this.addHistoricalAuthors(serverVars.historicalAuthorData);
    this._tellAceActiveAuthorInfo(this._initialUserInfo);

    this._editor.setProperty('userAuthor', this._userId);
    this._editor.setBaseAttributedText(serverVars.initialAttributedText, serverVars.apool);
    this._editor.setUserChangeNotificationCallback(() => this._handleUserChanges());
  }

  _handleUserChanges() {
    if (this._editor.getInInternationalComposition()) {
      // _handleUserChanges() will be called again once composition ends so there's no need to set
      // up a future call before returning.
      return;
    }
    const now = Date.now();
    const connecting = ['CONNECTING', 'RECONNECTING'].includes(this._channelState);
    if (!this._pad.socket || connecting) {
      if (connecting && now - this._startConnectTime > 20000) {
        this.setChannelState('DISCONNECTED', 'initsocketfail');
      } else {
        // check again in a bit
        setTimeout(() => this._handleUserChanges(), 1000);
      }
      return;
    }

    if (this._committing) {
      if (now - this._lastCommitTime > 20000) {
        // a commit is taking too long
        this.setChannelState('DISCONNECTED', 'slowcommit');
      } else if (now - this._lastCommitTime > 5000) {
        this._callbacks.onConnectionTrouble('SLOW');
      } else {
        // run again in a few seconds, to detect a disconnect
        setTimeout(() => this._handleUserChanges(), 3000);
      }
      return;
    }

    const earliestCommit = this._lastCommitTime + this.commitDelay;
    if (now < earliestCommit) {
      setTimeout(() => this._handleUserChanges(), earliestCommit - now);
      return;
    }

    let sentMessage = false;
    // Check if there are any pending revisions to be received from server.
    // Allow only if there are no pending revisions to be received from server
    if (!this._isPendingRevision) {
      const userChangesData = this._editor.prepareUserChangeset();
      if (userChangesData.changeset) {
        this._lastCommitTime = now;
        this._committing = true;
        this._stateMessage = {
          type: 'USER_CHANGES',
          baseRev: this._rev,
          changeset: userChangesData.changeset,
          apool: userChangesData.apool,
        };
        this.sendMessage(this._stateMessage);
        sentMessage = true;
        this._callbacks.onInternalAction('commitPerformed');
      }
    } else {
      // run again in a few seconds, to check if there was a reconnection attempt
      setTimeout(() => this._handleUserChanges(), 3000);
    }

    if (sentMessage) {
      // run again in a few seconds, to detect a disconnect
      setTimeout(() => this._handleUserChanges(), 3000);
    }
  }

  _acceptCommit() {
    this._editor.applyPreparedChangesetToBase();
    this.setStateIdle();
    try {
      this._callbacks.onInternalAction('commitAcceptedByServer');
      this._callbacks.onConnectionTrouble('OK');
    } catch (err) { /* intentionally ignored */ }
    this._handleUserChanges();
  }

  async sendMessage(msg) {
    await this._connectedGate;
    this._pad.socket.json.send(
        {
          type: 'COLLABROOM',
          component: 'pad',
          data: msg,
        });
  }

  handleMessageFromServer(evt) {
    if (!this._pad.socket) return;
    if (!evt.data) return;
    const wrapper = evt;
    if (wrapper.type !== 'COLLABROOM' && wrapper.type !== 'CUSTOM') return;
    const msg = wrapper.data;

    if (msg.type === 'NEW_CHANGES') {
      this._serverMessageTaskQueue.enqueue(async () => {
        // Avoid updating the DOM while the user is composing a character. Notes about this `await`:
        //   * `await null;` is equivalent to `await Promise.resolve(null);`, so if the user is not
        //     currently composing a character then execution will continue without error.
        //   * We assume that it is not possible for a new 'compositionstart' event to fire after
        //     the `await` but before the next line of code after the `await` (or, if it is
        //     possible, that the chances are so small or the consequences so minor that it's not
        //     worth addressing).
        await this._editor.getInInternationalComposition();
        const {newRev, changeset, author = '', apool} = msg;
        const nextRev = this._rev + 1;
        if (newRev !== nextRev) {
          window.console.warn(`bad message revision on NEW_CHANGES: ${newRev} not ${nextRev}`);
          // setChannelState("DISCONNECTED", "badmessage_newchanges");
          return;
        }
        this._rev = newRev;
        this._editor.applyChangesToBase(changeset, author, apool);
      });
    } else if (msg.type === 'ACCEPT_COMMIT') {
      this._serverMessageTaskQueue.enqueue(() => {
        const newRev = msg.newRev;
        const nextRev = this._rev + 1;
        if (newRev !== nextRev) {
          window.console.warn(`bad message revision on ACCEPT_COMMIT: ${newRev} not ${nextRev}`);
          // setChannelState("DISCONNECTED", "badmessage_acceptcommit");
          return;
        }
        this._rev = newRev;
        this._acceptCommit();
      });
    } else if (msg.type === 'CLIENT_RECONNECT') {
      // Server sends a CLIENT_RECONNECT message when there is a client reconnect.
      // Server also returns all pending revisions along with this CLIENT_RECONNECT message
      this._serverMessageTaskQueue.enqueue(() => {
        if (msg.noChanges) {
          // If no revisions are pending, just make everything normal
          this.setIsPendingRevision(false);
          return;
        }
        const {headRev, newRev, changeset, author = '', apool} = msg;
        const nextRev = this._rev + 1;
        if (newRev !== nextRev) {
          window.console.warn(`bad message revision on CLIENT_RECONNECT: ${newRev} not ${nextRev}`);
          // setChannelState("DISCONNECTED", "badmessage_acceptcommit");
          return;
        }
        this._rev = newRev;
        if (author === this._pad.getUserId()) {
          this._acceptCommit();
        } else {
          this._editor.applyChangesToBase(changeset, author, apool);
        }
        if (newRev === headRev) {
          // Once we have applied all pending revisions, make everything normal
          this.setIsPendingRevision(false);
        }
      });
    } else if (msg.type === 'USER_NEWINFO') {
      const userInfo = msg.userInfo;
      const id = userInfo.userId;

      // Avoid a race condition when setting colors.  If our color was set by a
      // query param, ignore our own "new user" message's color value.
      if (id === this._initialUserInfo.userId && this._initialUserInfo.globalUserColor) {
        msg.userInfo.colorId = this._initialUserInfo.globalUserColor;
      }


      if (this._userSet[id]) {
        this._userSet[id] = userInfo;
        this._callbacks.onUpdateUserInfo(userInfo);
      } else {
        this._userSet[id] = userInfo;
        this._callbacks.onUserJoin(userInfo);
      }
      this._tellAceActiveAuthorInfo(userInfo);
    } else if (msg.type === 'USER_LEAVE') {
      const userInfo = msg.userInfo;
      const id = userInfo.userId;
      if (this._userSet[id]) {
        delete this._userSet[userInfo.userId];
        this._fadeAceAuthorInfo(userInfo);
        this._callbacks.onUserLeave(userInfo);
      }
    } else if (msg.type === 'CLIENT_MESSAGE') {
      this._callbacks.onClientMessage(msg.payload);
    } else if (msg.type === 'CHAT_MESSAGE') {
      chat.addMessage(msg, true, false);
    } else if (msg.type === 'CHAT_MESSAGES') {
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
      if (chat.historyPointer <= 0) {
        $('#chatloadmessagesbutton').css('display', 'none');
      } else {
        // there are still more messages, re-show the load-button
        $('#chatloadmessagesbutton').css('display', 'block');
      }
    }

    // HACKISH: User messages do not have "payload" but "userInfo", so that all
    // "handleClientMessage_USER_" hooks would work, populate payload
    // FIXME: USER_* messages to have "payload" property instead of "userInfo",
    // seems like a quite a big work
    if (msg.type.indexOf('USER_') > -1) {
      msg.payload = msg.userInfo;
    }
    // Similar for NEW_CHANGES
    if (msg.type === 'NEW_CHANGES') msg.payload = msg;

    hooks.callAll(`handleClientMessage_${msg.type}`, {payload: msg.payload});
  }

  async updateUserInfo(userInfo) {
    await this._connectedGate;
    userInfo.userId = this._userId;
    this._userSet[this._userId] = userInfo;
    this._tellAceActiveAuthorInfo(userInfo);
    if (!this._pad.socket) return;
    await this.sendMessage(
        {
          type: 'USERINFO_UPDATE',
          userInfo,
        });
  }

  _tellAceActiveAuthorInfo(userInfo) {
    this._tellAceAuthorInfo(userInfo.userId, userInfo.colorId);
  }

  _tellAceAuthorInfo(userId, colorId, inactive) {
    if (typeof colorId === 'number') {
      colorId = clientVars.colorPalette[colorId];
    }

    const cssColor = colorId;
    if (inactive) {
      this._editor.setAuthorInfo(userId, {
        bgcolor: cssColor,
        fade: 0.5,
      });
    } else {
      this._editor.setAuthorInfo(userId, {
        bgcolor: cssColor,
      });
    }
  }

  _fadeAceAuthorInfo(userInfo) {
    this._tellAceAuthorInfo(userInfo.userId, userInfo.colorId, true);
  }

  getConnectedUsers() {
    return Object.values(this._userSet);
  }

  addHistoricalAuthors(hadata) {
    for (const [author, data] of Object.entries(hadata)) {
      if (!this._userSet[author]) {
        this._tellAceAuthorInfo(author, data.colorId, true);
      }
    }
  }

  setChannelState(newChannelState, moreInfo) {
    if (newChannelState === this._channelState) return;
    if (this._channelState === 'CONNECTED') {
      // The old channel state is CONNECTED, which means we have just disconnected. Re-initialize
      // this._connectedGate so that actions are deferred until connected again. Do this before
      // calling onChannelStateChange() so that the event handler can create deferred actions if
      // desired.
      this._connectedGate = new Gate();
    }
    this._channelState = newChannelState;
    this._callbacks.onChannelStateChange(this._channelState, moreInfo);
    switch (this._channelState) {
      case 'CONNECTING':
      case 'RECONNECTING':
        this._startConnectTime = Date.now();
        break;
      case 'CONNECTED':
        this._connectedGate.open();
        break;
    }
  }

  async sendClientMessage(msg) {
    await this.sendMessage(
        {
          type: 'CLIENT_MESSAGE',
          payload: msg,
        });
  }

  getCurrentRevisionNumber() {
    return this._rev;
  }

  getMissedChanges() {
    const obj = {};
    obj.userInfo = this._userSet[this._userId];
    obj.baseRev = this._rev;
    if (this._committing && this._stateMessage) {
      obj.committedChangeset = this._stateMessage.changeset;
      obj.committedChangesetAPool = this._stateMessage.apool;
      this._editor.applyPreparedChangesetToBase();
    }
    const userChangesData = this._editor.prepareUserChangeset();
    if (userChangesData.changeset) {
      obj.furtherChangeset = userChangesData.changeset;
      obj.furtherChangesetAPool = userChangesData.apool;
    }
    return obj;
  }

  setStateIdle() {
    this._committing = false;
    this._callbacks.onInternalAction('newlyIdle');
  }

  setIsPendingRevision(value) {
    this._isPendingRevision = value;
  }

  setOnUserJoin(cb) {
    this._callbacks.onUserJoin = cb;
  }

  setOnUserLeave(cb) {
    this._callbacks.onUserLeave = cb;
  }

  setOnUpdateUserInfo(cb) {
    this._callbacks.onUpdateUserInfo = cb;
  }

  setOnChannelStateChange(cb) {
    this._callbacks.onChannelStateChange = cb;
  }

  setOnClientMessage(cb) {
    this._callbacks.onClientMessage = cb;
  }

  setOnInternalAction(cb) {
    this._callbacks.onInternalAction = cb;
  }

  setOnConnectionTrouble(cb) {
    this._callbacks.onConnectionTrouble = cb;
  }
}

/** Call this when the document is ready, and a new Ace2Editor() has been created and inited.
    ACE's ready callback does not need to have fired yet.
    "serverVars" are from calling doc.getCollabClientVars() on the server. */
exports.getCollabClient = (ace2editor, serverVars, initialUserInfo, pad) => (
  new CollabClient(ace2editor, serverVars, initialUserInfo, pad));
