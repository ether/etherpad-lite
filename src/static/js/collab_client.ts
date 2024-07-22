'use strict';

/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

import {Ace2Editor} from "./ace";
import {ClientAcceptCommitMessage, ClientNewChanges, ClientSendMessages, ClientSendUserInfoUpdate, ClientUserChangesMessage, ClientVarData, ClientVarMessage, HistoricalAuthorData, ServerVar, UserInfo} from "./types/SocketIOMessage";
import {Pad} from "./pad";
import AttributePool from "./AttributePool";
import {MapArrayType} from "../../node/types/MapType";

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

// Dependency fill on init. This exists for `pad.socket` only.
// TODO: bind directly to the socket.

/** Call this when the document is ready, and a new Ace2Editor() has been created and inited.
    ACE's ready callback does not need to have fired yet.
    "serverVars" are from calling doc.getCollabClientVars() on the server. */
export class CollabClient {
  private editor: Ace2Editor;
  private serverVars: ServerVar;
  private initialUserInfo: any;
  private pad: Pad;
  private userSet = new Map<string, UserInfo> // userId -> userInfo
  private channelState: string;
  private initialStartConnectTime: number;
  private commitDelay: number;
  private committing: boolean;
  private rev: number;
  private userId: string
  // We need to present a working interface even before the socket
  // is connected for the first time.
  private  deferredActions:any[] = [];
  private stateMessage?: ClientUserChangesMessage;
  private lastCommitTime: number;
  private isPendingRevision: boolean;
  private idleFuncs: Function[] = [];

  constructor(ace2editor: Ace2Editor, serverVars: ServerVar, initialUserInfo: UserInfo, options:  {
    colorPalette: MapArrayType<number>
  }, pad: Pad) {
    this.serverVars = serverVars
    this.initialUserInfo = initialUserInfo
    this.pad = pad // Inject pad to avoid a circular dependency.

    this.editor = ace2editor;

    this.rev = serverVars.rev;
    this.committing = false;
    this.channelState = 'CONNECTING';
    this.lastCommitTime = 0;
    this.initialStartConnectTime = 0;
    this.commitDelay = 500;

    this.userId = initialUserInfo.userId;
    // var socket;
    this.userSet.set(this.userId,initialUserInfo);

    this.isPendingRevision = false;
    if (browser.firefox) {
      // Prevent "escape" from taking effect and canceling a comet connection;
      // doesn't work if focus is on an iframe.
      $(window).on('keydown', (evt) => {
        if (evt.which === 27) {
          evt.preventDefault();
        }
      });
    }

    this.tellAceAboutHistoricalAuthors(serverVars.historicalAuthorData);
    this.tellAceActiveAuthorInfo(initialUserInfo);

    // @ts-ignore
    this.editor.setProperty('userAuthor', this.userId);
    // @ts-ignore
    this.editor.setBaseAttributedText(serverVars.initialAttributedText, serverVars.apool);
    // @ts-ignore
    this.editor.setUserChangeNotificationCallback(this.handleUserChanges);

    this.setUpSocket();
  }
  callbacks = {
    onUserJoin: (userInfo: UserInfo) => {},
    onUserLeave: (userInfo: UserInfo) => {},
    onUpdateUserInfo: (userInfo: UserInfo) => {},
    onChannelStateChange: (newChannelState: string, moreInfo?: string) => {},
    onClientMessage: (clientmessage: ClientSendMessages) => {},
    onInternalAction: (res: string) => {},
    onConnectionTrouble: (res?: string) => {},
    onServerMessage: () => {},
  }

  handleUserChanges = () => {
    if (this.editor.getInInternationalComposition()) {
      // handleUserChanges() will be called again once composition ends so there's no need to set up
      // a future call before returning.
      return;
    }
    const now = Date.now();
    if ((!this.pad.socket) || this.channelState === 'CONNECTING') {
      if (this.channelState === 'CONNECTING' && (now - this.initialStartConnectTime) > 20000) {
        this.setChannelState('DISCONNECTED', 'initsocketfail');
      } else {
        // check again in a bit
        setTimeout(this.handleUserChanges, 1000);
      }
      return;
    }

    if (this.committing) {
      if (now - this.lastCommitTime > 20000) {
        // a commit is taking too long
        this.setChannelState('DISCONNECTED', 'slowcommit');
      } else if (now - this.lastCommitTime > 5000) {
        this.callbacks.onConnectionTrouble('SLOW');
      } else {
        // run again in a few seconds, to detect a disconnect
        setTimeout(this.handleUserChanges, 3000);
      }
      return;
    }

    const earliestCommit = this.lastCommitTime + this.commitDelay;
    if (now < earliestCommit) {
      setTimeout(this.handleUserChanges, earliestCommit - now);
      return;
    }

    let sentMessage = false;
    // Check if there are any pending revisions to be received from server.
    // Allow only if there are no pending revisions to be received from server
    if (!this.isPendingRevision) {
      const userChangesData = this.editor.prepareUserChangeset();
      if (userChangesData.changeset) {
        this.lastCommitTime = now;
        this.committing = true;
        this.stateMessage = {
          type: 'USER_CHANGES',
          baseRev: this.rev,
          changeset: userChangesData.changeset,
          apool: userChangesData.apool,
        } satisfies ClientUserChangesMessage;
        this.sendMessage(this.stateMessage);
        sentMessage = true;
        this.callbacks.onInternalAction('commitPerformed');
      }
    } else {
      // run again in a few seconds, to check if there was a reconnection attempt
      setTimeout(this.handleUserChanges, 3000);
    }

    if (sentMessage) {
      // run again in a few seconds, to detect a disconnect
      setTimeout(this.handleUserChanges, 3000);
    }
  }

  acceptCommit = () => {
    // @ts-ignore
    this.editor.applyPreparedChangesetToBase();
    this.setStateIdle();
    try {
      this.callbacks.onInternalAction('commitAcceptedByServer');
      this.callbacks.onConnectionTrouble('OK');
    } catch (err) { /* intentionally ignored */ }
    this.handleUserChanges();
  }

  setUpSocket = () => {
    this.setChannelState('CONNECTED');
    this.doDeferredActions();

    this.initialStartConnectTime = Date.now();
  }

  sendMessage = (msg: ClientSendMessages) => {
    this.pad.socket!.emit('message',
      {
        type: 'COLLABROOM',
        component: 'pad',
        data: msg,
      });
  }

  serverMessageTaskQueue = new class {
    private _promiseChain: Promise<any>
    constructor() {
      this._promiseChain = Promise.resolve();
    }

    async enqueue(fn: (val: any)=>void) {
      const taskPromise = this._promiseChain.then(fn);
      // Use .catch() to prevent rejections from halting the queue.
      this._promiseChain = taskPromise.catch(() => {});
      // Do NOT do `return await this._promiseChain;` because the caller would not see an error if
      // fn() throws/rejects (due to the .catch() added above).
      return await taskPromise;
    }
  }()

  handleMessageFromServer = (evt: ClientVarMessage) => {
    if (!this.pad.socket()) return;
    if (!("data" in evt)) return;
    const wrapper = evt;
    if (wrapper.type !== 'COLLABROOM' && wrapper.type !== 'CUSTOM') return;
    const msg = wrapper.data;

    if (msg.type === 'NEW_CHANGES') {
      this.serverMessageTaskQueue.enqueue(async () => {
        // Avoid updating the DOM while the user is composing a character. Notes about this `await`:
        //   * `await null;` is equivalent to `await Promise.resolve(null);`, so if the user is not
        //     currently composing a character then execution will continue without error.
        //   * We assume that it is not possible for a new 'compositionstart' event to fire after
        //     the `await` but before the next line of code after the `await` (or, if it is
        //     possible, that the chances are so small or the consequences so minor that it's not
        //     worth addressing).
        await this.editor.getInInternationalComposition();
        const {newRev, changeset, author = '', apool} = msg;
        if (newRev !== (this.rev + 1)) {
          window.console.warn(`bad message revision on NEW_CHANGES: ${newRev} not ${this.rev + 1}`);
          // setChannelState("DISCONNECTED", "badmessage_newchanges");
          return;
        }
        this.rev = newRev;
        // @ts-ignore
        this.editor.applyChangesToBase(changeset, author, apool);
      });
    } else if (msg.type === 'ACCEPT_COMMIT') {
      this.serverMessageTaskQueue.enqueue(() => {
        const {newRev} = msg as ClientAcceptCommitMessage;
        // newRev will equal rev if the changeset has no net effect (identity changeset, removing
        // and re-adding the same characters with the same attributes, or retransmission of an
        // already applied changeset).
        if (![this.rev, this.rev + 1].includes(newRev)) {
          window.console.warn(`bad message revision on ACCEPT_COMMIT: ${newRev} not ${this.rev + 1}`);
          // setChannelState("DISCONNECTED", "badmessage_acceptcommit");
          return;
        }
        this.rev = newRev;
        this.acceptCommit();
      });
    } else if (msg.type === 'CLIENT_RECONNECT') {
      // Server sends a CLIENT_RECONNECT message when there is a client reconnect.
      // Server also returns all pending revisions along with this CLIENT_RECONNECT message
      this.serverMessageTaskQueue.enqueue(() => {
        if (msg.noChanges) {
          // If no revisions are pending, just make everything normal
          this.setIsPendingRevision(false);
          return;
        }
        const {headRev, newRev, changeset, author = '', apool} = msg;
        if (newRev !== (this.rev + 1)) {
          window.console.warn(`bad message revision on CLIENT_RECONNECT: ${newRev} not ${this.rev + 1}`);
          // setChannelState("DISCONNECTED", "badmessage_acceptcommit");
          return;
        }
        this.rev = newRev;
        if (author === this.pad.getUserId()) {
          this.acceptCommit();
        } else {
          // @ts-ignore
          this.editor.applyChangesToBase(changeset, author, apool);
        }
        if (newRev === headRev) {
          // Once we have applied all pending revisions, make everything normal
          this.setIsPendingRevision(false);
        }
      });
    } else if (msg.type === 'USER_NEWINFO') {
      const userInfo = msg.userInfo;
      const id = userInfo.userId;
      if (this.userSet.has(id)) {
        this.userSet.set(id,userInfo);
        this.callbacks.onUpdateUserInfo(userInfo);
      } else {
        this.userSet.set(id,userInfo);
        this.callbacks.onUserJoin(userInfo);
      }
      this.tellAceActiveAuthorInfo(userInfo);
    } else if (msg.type === 'USER_LEAVE') {
      const userInfo = msg.userInfo;
      const id = userInfo.userId;
      if (this.userSet.has(id)) {
        this.userSet.delete(userInfo.userId);
        this.fadeAceAuthorInfo(userInfo);
        this.callbacks.onUserLeave(userInfo);
      }
    } else if (msg.type === 'CLIENT_MESSAGE') {
      this.callbacks.onClientMessage(msg.payload);
    } else if (msg.type === 'CHAT_MESSAGE') {
      chat.addMessage(msg.message, true, false);
    } else if (msg.type === 'CHAT_MESSAGES') {
      for (let i = msg.messages.length - 1; i >= 0; i--) {
        chat.addMessage(msg.messages[i], true, true);
      }
      if (!chat.gotInitalMessages) {
        chat.scrollDown();
        chat.gotInitalMessages = true;
        chat.historyPointer = window.clientVars.chatHead - msg.messages.length;
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
      // @ts-ignore
      msg.payload = msg.userInfo;
    }
    // Similar for NEW_CHANGES
    if (msg.type === 'NEW_CHANGES') {
      msg.payload = msg;
    }

    // @ts-ignore
    hooks.callAll(`handleClientMessage_${msg.type}`, {payload: msg.payload});
  }

  updateUserInfo = (userInfo: UserInfo) => {
    userInfo.userId = this.userId;
    this.userSet.set(this.userId, userInfo);
    this.tellAceActiveAuthorInfo(userInfo);
    if (!this.pad.socket()) return;
    this.sendMessage(
      {
        type: 'USERINFO_UPDATE',
        userInfo,
      });
  };
  tellAceActiveAuthorInfo = (userInfo: UserInfo) => {
    this.tellAceAuthorInfo(userInfo.userId, userInfo.colorId);
  }

  tellAceAuthorInfo = (userId: string, colorId: number|object, inactive?: boolean) => {
    if (typeof colorId === 'number') {
      // @ts-ignore
      colorId = window.clientVars.colorPalette[colorId];
    }

    const cssColor = colorId;
    if (inactive) {
      this.editor.setAuthorInfo(userId, {
        bgcolor: cssColor,
        fade: 0.5,
      });
    } else {
      this.editor.setAuthorInfo(userId, {
        bgcolor: cssColor,
      });
    }
  }

  fadeAceAuthorInfo = (userInfo: UserInfo) => {
    this.tellAceAuthorInfo(userInfo.userId, userInfo.colorId, true);
  }
  getConnectedUsers = () => this.valuesArray(this.userSet);
  tellAceAboutHistoricalAuthors = (hadata: HistoricalAuthorData) => {
    for (const [author, data] of Object.entries(hadata)) {
      if (!this.userSet.has(author)) {
        this.tellAceAuthorInfo(author, data.colorId, true);
      }
    }
  }
  setChannelState = (newChannelState: string, moreInfo?: string) => {
    if (newChannelState !== this.channelState) {
      this.channelState = newChannelState;
      this.callbacks.onChannelStateChange(this.channelState, moreInfo);
    }
  }

  valuesArray = (obj: Map<string, UserInfo>) => {
    const array: UserInfo[] = [];

    for (let entry of obj.values()) {
      array.push(entry)
    }
    return array;
  };

  defer = (func: Function, tag?: string) =>  (...args:any[])=> {
    const action = () => {
      func.call(this, ...args);
    };
    action.tag = tag;
    if (this.channelState === 'CONNECTING') {
      this.deferredActions.push(action);
    } else {
      action();
    }
  }
  doDeferredActions = (tag?: string) => {
    const newArray = [];
    for (let i = 0; i < this.deferredActions.length; i++) {
      const a = this.deferredActions[i];
      if ((!tag) || (tag === a.tag)) {
        a();
      } else {
        newArray.push(a);
      }
    }
    this.deferredActions = newArray;
  }
  sendClientMessage = (msg: ClientSendMessages) => {
    this.sendMessage(
      {
        type: 'CLIENT_MESSAGE',
        payload: msg,
      });
  }

  getCurrentRevisionNumber = () => this.rev
  getMissedChanges = () => {
    const obj:{
      userInfo?: UserInfo,
      baseRev?: number,
      committedChangeset?: string,
      committedChangesetAPool?: AttributePool,
      furtherChangeset?: string,
      furtherChangesetAPool?: AttributePool
    } = {};
    obj.userInfo = this.userSet.get(this.userId);
    obj.baseRev = this.rev;
    if (this.committing && this.stateMessage) {
      obj.committedChangeset = this.stateMessage.changeset;
      obj.committedChangesetAPool = this.stateMessage.apool;
      // @ts-ignore
      this.editor.applyPreparedChangesetToBase();
    }
    const userChangesData = this.editor.prepareUserChangeset();
    if (userChangesData.changeset) {
      obj.furtherChangeset = userChangesData.changeset;
      obj.furtherChangesetAPool = userChangesData.apool;
    }
    return obj;
  }
  setStateIdle = () => {
    this.committing = false;
    this.callbacks.onInternalAction('newlyIdle');
    this.schedulePerhapsCallIdleFuncs();
  }
  setIsPendingRevision = (value: boolean) => {
    this.isPendingRevision = value;
  }

  callWhenNotCommitting = (func: Function) => {
    this.idleFuncs.push(func);
    this.schedulePerhapsCallIdleFuncs();
  }

  schedulePerhapsCallIdleFuncs = () => {
    setTimeout(() => {
      if (!this.committing) {
        while (this.idleFuncs.length > 0) {
          const f = this.idleFuncs.shift()!;
          f();
        }
      }
    }, 0);
  }
  setOnUserJoin= (cb: (userInfo: UserInfo)=>void) => {
    this.callbacks.onUserJoin = cb;
  }
  setOnUserLeave= (cb: (userInfo: UserInfo) => void) => {
    this.callbacks.onUserLeave = cb;
  }
  setOnUpdateUserInfo= (cb: (userInfo: UserInfo) => void) => {
    this.callbacks.onUpdateUserInfo = cb;
  }
  setOnChannelStateChange =  (cb: (newChannelState: string, moreInfo?: string) => void) => {
    this.callbacks.onChannelStateChange = cb;
  }
  setOnClientMessage =  (cb: (clientmessage: ClientSendMessages) => void) => {
    this.callbacks.onClientMessage = cb;
  }
  setOnInternalAction =  (cb: (res: string) => void) => {
    this.callbacks.onInternalAction = cb;
  }
  setOnConnectionTrouble =  (cb: (res?: string) => void) => {
    this.callbacks.onConnectionTrouble = cb;
  }
  pupdateUserInfo =  this.defer(this.updateUserInfo)
  addHistoricalAuthors=  this.tellAceAboutHistoricalAuthors
  setCommitDelay = (ms: number) => {
    this.commitDelay = ms
  }
}


export default CollabClient
