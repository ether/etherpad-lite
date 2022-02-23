'use strict';
/**
 * The MessageHandler handles all Messages that comes from Socket.IO and controls the sessions
 */

/*
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

const padManager = require('../db/PadManager');
const Changeset = require('../../static/js/Changeset');
const ChatMessage = require('../../static/js/ChatMessage');
const AttributePool = require('../../static/js/AttributePool');
const AttributeManager = require('../../static/js/AttributeManager');
const authorManager = require('../db/AuthorManager');
const readOnlyManager = require('../db/ReadOnlyManager');
const settings = require('../utils/Settings');
const securityManager = require('../db/SecurityManager');
const plugins = require('../../static/js/pluginfw/plugin_defs.js');
const log4js = require('log4js');
const messageLogger = log4js.getLogger('message');
const accessLogger = log4js.getLogger('access');
const _ = require('underscore');
const hooks = require('../../static/js/pluginfw/hooks.js');
const stats = require('../stats');
const assert = require('assert').strict;
const {RateLimiterMemory} = require('rate-limiter-flexible');
const webaccess = require('../hooks/express/webaccess');

let rateLimiter;
let socketio = null;

hooks.deprecationNotices.clientReady = 'use the userJoin hook instead';

exports.socketio = () => {
  // The rate limiter is created in this hook so that restarting the server resets the limiter. The
  // settings.commitRateLimiting object is passed directly to the rate limiter so that the limits
  // can be dynamically changed during runtime by modifying its properties.
  rateLimiter = new RateLimiterMemory(settings.commitRateLimiting);
};

/**
 * Contains information about socket.io connections:
 *   - key: Socket.io socket ID.
 *   - value: Object that is initially empty immediately after connect. Once the client's
 *     CLIENT_READY message is processed, it has the following properties:
 *       - auth: Object with the following properties copied from the client's CLIENT_READY message:
 *           - padID: Pad ID requested by the user. Unlike the padId property described below, this
 *             may be a read-only pad ID.
 *           - sessionID: Copied from the client's sessionID cookie, which should be the value
 *             returned from the createSession() HTTP API. This will be null/undefined if
 *             createSession() isn't used or the portal doesn't set the sessionID cookie.
 *           - token: User-supplied token.
 *       - author: The user's author ID.
 *       - padId: The real (not read-only) ID of the pad.
 *       - readOnlyPadId: The read-only ID of the pad.
 *       - readonly: Whether the client has read-only access (true) or read/write access (false).
 *       - rev: The last revision that was sent to the client.
 */
const sessioninfos = {};
exports.sessioninfos = sessioninfos;

stats.gauge('totalUsers', () => socketio ? Object.keys(socketio.sockets.sockets).length : 0);
stats.gauge('activePads', () => {
  const padIds = new Set();
  for (const {padId} of Object.values(sessioninfos)) {
    if (!padId) continue;
    padIds.add(padId);
  }
  return padIds.size;
});

/**
 * Processes one task at a time per channel.
 */
class Channels {
  /**
   * @param {(ch, task) => any} [exec] - Task executor. If omitted, tasks are assumed to be
   *     functions that will be executed with the channel as the only argument.
   */
  constructor(exec = (ch, task) => task(ch)) {
    this._exec = exec;
    this._promiseChains = new Map();
  }

  /**
   * Schedules a task for execution. The task will be executed once all previously enqueued tasks
   * for the named channel have completed.
   *
   * @param {any} ch - Identifies the channel.
   * @param {any} task - The task to give to the executor.
   * @returns {Promise<any>} The value returned by the executor.
   */
  async enqueue(ch, task) {
    const p = (this._promiseChains.get(ch) || Promise.resolve()).then(() => this._exec(ch, task));
    const pc = p
        .catch(() => {}) // Prevent rejections from halting the queue.
        .then(() => {
          // Clean up this._promiseChains if there are no more tasks for the channel.
          if (this._promiseChains.get(ch) === pc) this._promiseChains.delete(ch);
        });
    this._promiseChains.set(ch, pc);
    return await p;
  }
}

/**
 * A changeset queue per pad that is processed by handleUserChanges()
 */
const padChannels = new Channels((ch, {socket, message}) => handleUserChanges(socket, message));

/**
 * This Method is called by server.js to tell the message handler on which socket it should send
 * @param socket_io The Socket
 */
exports.setSocketIO = (socket_io) => {
  socketio = socket_io;
};

/**
 * Handles the connection of a new user
 * @param socket the socket.io Socket object for the new connection from the client
 */
exports.handleConnect = (socket) => {
  stats.meter('connects').mark();

  // Initialize sessioninfos for this new session
  sessioninfos[socket.id] = {};
};

/**
 * Kicks all sessions from a pad
 */
exports.kickSessionsFromPad = (padID) => {
  if (typeof socketio.sockets.clients !== 'function') return;

  // skip if there is nobody on this pad
  if (_getRoomSockets(padID).length === 0) return;

  // disconnect everyone from this pad
  socketio.sockets.in(padID).json.send({disconnect: 'deleted'});
};

/**
 * Handles the disconnection of a user
 * @param socket the socket.io Socket object for the client
 */
exports.handleDisconnect = async (socket) => {
  stats.meter('disconnects').mark();
  const session = sessioninfos[socket.id];
  delete sessioninfos[socket.id];
  // session.padId can be nullish if the user disconnects before sending CLIENT_READY.
  if (!session || !session.author || !session.padId) return;
  const {session: {user} = {}} = socket.client.request;
  /* eslint-disable prefer-template -- it doesn't support breaking across multiple lines */
  accessLogger.info('[LEAVE]' +
                    ` pad:${session.padId}` +
                    ` socket:${socket.id}` +
                    ` IP:${settings.disableIPlogging ? 'ANONYMOUS' : socket.request.ip}` +
                    ` authorID:${session.author}` +
                    (user && user.username ? ` username:${user.username}` : ''));
  /* eslint-enable prefer-template */
  socket.broadcast.to(session.padId).json.send({
    type: 'COLLABROOM',
    data: {
      type: 'USER_LEAVE',
      userInfo: {
        colorId: await authorManager.getAuthorColorId(session.author),
        userId: session.author,
      },
    },
  });
  await hooks.aCallAll('userLeave', {
    ...session, // For backwards compatibility.
    authorId: session.author,
    readOnly: session.readonly,
    socket,
  });
};

/**
 * Handles a message from a user
 * @param socket the socket.io Socket object for the client
 * @param message the message from the client
 */
exports.handleMessage = async (socket, message) => {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    try {
      await rateLimiter.consume(socket.request.ip); // consume 1 point per event from IP
    } catch (e) {
      messageLogger.warn(`Rate limited IP ${socket.request.ip}. To reduce the amount of rate ` +
                         'limiting that happens edit the rateLimit values in settings.json');
      stats.meter('rateLimited').mark();
      socket.json.send({disconnect: 'rateLimited'});
      return;
    }
  }

  if (message == null) {
    return;
  }

  if (!message.type) {
    return;
  }

  const thisSession = sessioninfos[socket.id];

  if (!thisSession) {
    messageLogger.warn('Dropped message from an unknown connection.');
    return;
  }

  if (message.type === 'CLIENT_READY') {
    // Remember this information since we won't have the cookie in further socket.io messages. This
    // information will be used to check if the sessionId of this connection is still valid since it
    // could have been deleted by the API.
    thisSession.auth = {
      sessionID: message.sessionID,
      padID: message.padId,
      token: message.token,
    };
  }
  // Outside of the checks done by this function, message.padId must not be accessed because it is
  // too easy to introduce a security vulnerability that allows malicious users to read or modify
  // pads that they should not be able to access. Code should instead use
  // sessioninfos[socket.id].padId if the real pad ID is needed or
  // sessioninfos[socket.id].auth.padID if the original user-supplied pad ID is needed.
  Object.defineProperty(message, 'padId', {get: () => {
    throw new Error('message.padId must not be accessed (for security reasons)');
  }});

  const auth = thisSession.auth;
  if (!auth) {
    const ip = settings.disableIPlogging ? 'ANONYMOUS' : (socket.request.ip || '<unknown>');
    const msg = JSON.stringify(message, null, 2);
    messageLogger.error(`Dropping pre-CLIENT_READY message from IP ${ip}: ${msg}`);
    messageLogger.debug(
        'If you are using the stress-test tool then restart Etherpad and the Stress test tool.');
    return;
  }

  const {session: {user} = {}} = socket.client.request;
  const {accessStatus, authorID} =
      await securityManager.checkAccess(auth.padID, auth.sessionID, auth.token, user);
  if (accessStatus !== 'grant') {
    // Access denied. Send the reason to the user.
    socket.json.send({accessStatus});
    return;
  }
  if (thisSession.author != null && thisSession.author !== authorID) {
    messageLogger.warn(
        `${'Rejecting message from client because the author ID changed mid-session.' +
        ' Bad or missing token or sessionID?' +
        ` socket:${socket.id}` +
        ` IP:${settings.disableIPlogging ? 'ANONYMOUS' : socket.request.ip}` +
        ` originalAuthorID:${thisSession.author}` +
        ` newAuthorID:${authorID}`}${
          (user && user.username) ? ` username:${user.username}` : ''
        } message:${message}`);
    socket.json.send({disconnect: 'rejected'});
    return;
  }
  thisSession.author = authorID;

  // Allow plugins to bypass the readonly message blocker
  const context = {message, socket, client: socket}; // `client` for backwards compatibility.
  if ((await hooks.aCallAll('handleMessageSecurity', context)).some((w) => w === true)) {
    thisSession.readonly = false;
  }

  // Call handleMessage hook. If a plugin returns null, the message will be dropped.
  if ((await hooks.aCallAll('handleMessage', context)).some((m) => m == null)) {
    return;
  }

  // Drop the message if the client disconnected during the above processing.
  if (sessioninfos[socket.id] !== thisSession) {
    messageLogger.warn('Dropping message from a connection that has gone away.');
    return;
  }

  // Check what type of message we get and delegate to the other methods
  if (message.type === 'CLIENT_READY') {
    await handleClientReady(socket, message);
  } else if (message.type === 'CHANGESET_REQ') {
    await handleChangesetRequest(socket, message);
  } else if (message.type === 'COLLABROOM') {
    if (thisSession.readonly) {
      messageLogger.warn('Dropped message, COLLABROOM for readonly pad');
    } else if (message.data.type === 'USER_CHANGES') {
      stats.counter('pendingEdits').inc();
      await padChannels.enqueue(thisSession.padId, {socket, message});
    } else if (message.data.type === 'USERINFO_UPDATE') {
      await handleUserInfoUpdate(socket, message);
    } else if (message.data.type === 'CHAT_MESSAGE') {
      await handleChatMessage(socket, message);
    } else if (message.data.type === 'GET_CHAT_MESSAGES') {
      await handleGetChatMessages(socket, message);
    } else if (message.data.type === 'SAVE_REVISION') {
      await handleSaveRevisionMessage(socket, message);
    } else if (message.data.type === 'CLIENT_MESSAGE' &&
               message.data.payload != null &&
               message.data.payload.type === 'suggestUserName') {
      handleSuggestUserName(socket, message);
    } else {
      messageLogger.warn(`Dropped message, unknown COLLABROOM Data  Type ${message.data.type}`);
    }
  } else {
    messageLogger.warn(`Dropped message, unknown Message Type ${message.type}`);
  }
};


/**
 * Handles a save revision message
 * @param socket the socket.io Socket object for the client
 * @param message the message from the client
 */
const handleSaveRevisionMessage = async (socket, message) => {
  const {padId, author: authorId} = sessioninfos[socket.id];
  const pad = await padManager.getPad(padId);
  await pad.addSavedRevision(pad.head, authorId);
};

/**
 * Handles a custom message, different to the function below as it handles
 * objects not strings and you can direct the message to specific sessionID
 *
 * @param msg {Object} the message we're sending
 * @param sessionID {string} the socketIO session to which we're sending this message
 */
exports.handleCustomObjectMessage = (msg, sessionID) => {
  if (msg.data.type === 'CUSTOM') {
    if (sessionID) {
      // a sessionID is targeted: directly to this sessionID
      socketio.sockets.socket(sessionID).json.send(msg);
    } else {
      // broadcast to all clients on this pad
      socketio.sockets.in(msg.data.payload.padId).json.send(msg);
    }
  }
};

/**
 * Handles a custom message (sent via HTTP API request)
 *
 * @param padID {Pad} the pad to which we're sending this message
 * @param msgString {String} the message we're sending
 */
exports.handleCustomMessage = (padID, msgString) => {
  const time = Date.now();
  const msg = {
    type: 'COLLABROOM',
    data: {
      type: msgString,
      time,
    },
  };
  socketio.sockets.in(padID).json.send(msg);
};

/**
 * Handles a Chat Message
 * @param socket the socket.io Socket object for the client
 * @param message the message from the client
 */
const handleChatMessage = async (socket, message) => {
  const chatMessage = ChatMessage.fromObject(message.data.message);
  const {padId, author: authorId} = sessioninfos[socket.id];
  // Don't trust the user-supplied values.
  chatMessage.time = Date.now();
  chatMessage.authorId = authorId;
  await exports.sendChatMessageToPadClients(chatMessage, padId);
};

/**
 * Adds a new chat message to a pad and sends it to connected clients.
 *
 * @param {(ChatMessage|number)} mt - Either a chat message object (recommended) or the timestamp of
 *     the chat message in ms since epoch (deprecated).
 * @param {string} puId - If `mt` is a chat message object, this is the destination pad ID.
 *     Otherwise, this is the user's author ID (deprecated).
 * @param {string} [text] - The text of the chat message. Deprecated; use `mt.text` instead.
 * @param {string} [padId] - The destination pad ID. Deprecated; pass a chat message
 *     object as the first argument and the destination pad ID as the second argument instead.
 */
exports.sendChatMessageToPadClients = async (mt, puId, text = null, padId = null) => {
  const message = mt instanceof ChatMessage ? mt : new ChatMessage(text, puId, mt);
  padId = mt instanceof ChatMessage ? puId : padId;
  const pad = await padManager.getPad(padId);
  await hooks.aCallAll('chatNewMessage', {message, pad, padId});
  // pad.appendChatMessage() ignores the displayName property so we don't need to wait for
  // authorManager.getAuthorName() to resolve before saving the message to the database.
  const promise = pad.appendChatMessage(message);
  message.displayName = await authorManager.getAuthorName(message.userId);
  socketio.sockets.in(padId).json.send({
    type: 'COLLABROOM',
    data: {type: 'CHAT_MESSAGE', message},
  });
  await promise;
};

/**
 * Handles the clients request for more chat-messages
 * @param socket the socket.io Socket object for the client
 * @param message the message from the client
 */
const handleGetChatMessages = async (socket, message) => {
  if (message.data.start == null) {
    messageLogger.warn('Dropped message, GetChatMessages Message has no start!');
    return;
  }

  if (message.data.end == null) {
    messageLogger.warn('Dropped message, GetChatMessages Message has no start!');
    return;
  }

  const start = message.data.start;
  const end = message.data.end;
  const count = end - start;

  if (count < 0 || count > 100) {
    messageLogger.warn(
        'Dropped message, GetChatMessages Message, client requested invalid amount of messages!');
    return;
  }

  const padId = sessioninfos[socket.id].padId;
  const pad = await padManager.getPad(padId);

  const chatMessages = await pad.getChatMessages(start, end);
  const infoMsg = {
    type: 'COLLABROOM',
    data: {
      type: 'CHAT_MESSAGES',
      messages: chatMessages,
    },
  };

  // send the messages back to the client
  socket.json.send(infoMsg);
};

/**
 * Handles a handleSuggestUserName, that means a user have suggest a userName for a other user
 * @param socket the socket.io Socket object for the client
 * @param message the message from the client
 */
const handleSuggestUserName = (socket, message) => {
  // check if all ok
  if (message.data.payload.newName == null) {
    messageLogger.warn('Dropped message, suggestUserName Message has no newName!');
    return;
  }

  if (message.data.payload.unnamedId == null) {
    messageLogger.warn('Dropped message, suggestUserName Message has no unnamedId!');
    return;
  }

  const padId = sessioninfos[socket.id].padId;

  // search the author and send him this message
  _getRoomSockets(padId).forEach((socket) => {
    const session = sessioninfos[socket.id];
    if (session && session.author === message.data.payload.unnamedId) {
      socket.json.send(message);
    }
  });
};

/**
 * Handles a USERINFO_UPDATE, that means that a user have changed his color or name.
 * Anyway, we get both informations
 * @param socket the socket.io Socket object for the client
 * @param message the message from the client
 */
const handleUserInfoUpdate = async (socket, message) => {
  // check if all ok
  if (message.data.userInfo == null) {
    messageLogger.warn('Dropped message, USERINFO_UPDATE Message has no userInfo!');
    return;
  }

  if (message.data.userInfo.colorId == null) {
    messageLogger.warn('Dropped message, USERINFO_UPDATE Message has no colorId!');
    return;
  }

  // Check that we have a valid session and author to update.
  const session = sessioninfos[socket.id];
  if (!session || !session.author || !session.padId) {
    messageLogger.warn(`Dropped message, USERINFO_UPDATE Session not ready.${message.data}`);
    return;
  }

  // Find out the author name of this session
  const author = session.author;

  // Check colorId is a Hex color
  // for #f00 (Thanks Smamatti)
  const isColor = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(message.data.userInfo.colorId);
  if (!isColor) {
    messageLogger.warn(`Dropped message, USERINFO_UPDATE Color is malformed.${message.data}`);
    return;
  }

  // Tell the authorManager about the new attributes
  const p = Promise.all([
    authorManager.setAuthorColorId(author, message.data.userInfo.colorId),
    authorManager.setAuthorName(author, message.data.userInfo.name),
  ]);

  const padId = session.padId;

  const infoMsg = {
    type: 'COLLABROOM',
    data: {
      // The Client doesn't know about USERINFO_UPDATE, use USER_NEWINFO
      type: 'USER_NEWINFO',
      userInfo: {
        userId: author,
        // set a null name, when there is no name set. cause the client wants it null
        name: message.data.userInfo.name || null,
        colorId: message.data.userInfo.colorId,
      },
    },
  };

  // Send the other clients on the pad the update message
  socket.broadcast.to(padId).json.send(infoMsg);

  // Block until the authorManager has stored the new attributes.
  await p;
};

/**
 * Handles a USER_CHANGES message, where the client submits its local
 * edits as a changeset.
 *
 * This handler's job is to update the incoming changeset so that it applies
 * to the latest revision, then add it to the pad, broadcast the changes
 * to all other clients, and send a confirmation to the submitting client.
 *
 * This function is based on a similar one in the original Etherpad.
 *   See https://github.com/ether/pad/blob/master/etherpad/src/etherpad/collab/collab_server.js in the function applyUserChanges()
 *
 * @param socket the socket.io Socket object for the client
 * @param message the message from the client
 */
const handleUserChanges = async (socket, message) => {
  // This one's no longer pending, as we're gonna process it now
  stats.counter('pendingEdits').dec();

  // The client might disconnect between our callbacks. We should still
  // finish processing the changeset, so keep a reference to the session.
  const thisSession = sessioninfos[socket.id];

  // TODO: this might happen with other messages too => find one place to copy the session
  // and always use the copy. atm a message will be ignored if the session is gone even
  // if the session was valid when the message arrived in the first place
  if (!thisSession) {
    messageLogger.warn('Ignoring USER_CHANGES from disconnected user');
    return;
  }

  // Measure time to process edit
  const stopWatch = stats.timer('edits').start();
  try {
    const {data: {baseRev, apool, changeset}} = message;
    if (baseRev == null) throw new Error('missing baseRev');
    if (apool == null) throw new Error('missing apool');
    if (changeset == null) throw new Error('missing changeset');
    const wireApool = (new AttributePool()).fromJsonable(apool);
    const pad = await padManager.getPad(thisSession.padId);

    // Verify that the changeset has valid syntax and is in canonical form
    Changeset.checkRep(changeset);

    // Verify that the attribute indexes used in the changeset are all
    // defined in the accompanying attribute pool.
    Changeset.eachAttribNumber(changeset, (n) => {
      if (!wireApool.getAttrib(n)) {
        throw new Error(`Attribute pool is missing attribute ${n} for changeset ${changeset}`);
      }
    });

    // Validate all added 'author' attribs to be the same value as the current user
    const iterator = Changeset.opIterator(Changeset.unpack(changeset).ops);
    let op;

    while (iterator.hasNext()) {
      op = iterator.next();

      // + can add text with attribs
      // = can change or add attribs
      // - can have attribs, but they are discarded and don't show up in the attribs -
      // but do show up in the pool

      op.attribs.split('*').forEach((attr) => {
        if (!attr) return;

        attr = wireApool.getAttrib(Changeset.parseNum(attr));
        if (!attr) return;

        // the empty author is used in the clearAuthorship functionality so this
        // should be the only exception
        if ('author' === attr[0] && (attr[1] !== thisSession.author && attr[1] !== '')) {
          throw new Error(`Author ${thisSession.author} tried to submit changes as author ` +
                          `${attr[1]} in changeset ${changeset}`);
        }
      });
    }

    // ex. adoptChangesetAttribs

    // Afaik, it copies the new attributes from the changeset, to the global Attribute Pool
    let rebasedChangeset = Changeset.moveOpsToNewPool(changeset, wireApool, pad.pool);

    // ex. applyUserChanges
    let r = baseRev;

    // The client's changeset might not be based on the latest revision,
    // since other clients are sending changes at the same time.
    // Update the changeset so that it can be applied to the latest revision.
    while (r < pad.getHeadRevisionNumber()) {
      r++;

      const c = await pad.getRevisionChangeset(r);

      // At this point, both "c" (from the pad) and "changeset" (from the
      // client) are relative to revision r - 1. The follow function
      // rebases "changeset" so that it is relative to revision r
      // and can be applied after "c".

      // a changeset can be based on an old revision with the same changes in it
      // prevent eplite from accepting it TODO: better send the client a NEW_CHANGES
      // of that revision
      if (baseRev + 1 === r && c === changeset) throw new Error('Changeset already accepted');

      rebasedChangeset = Changeset.follow(c, rebasedChangeset, false, pad.pool);
    }

    const prevText = pad.text();

    if (Changeset.oldLen(rebasedChangeset) !== prevText.length) {
      throw new Error(
          `Can't apply changeset ${rebasedChangeset} with oldLen ` +
          `${Changeset.oldLen(rebasedChangeset)} to document of length ${prevText.length}`);
    }

    await pad.appendRevision(rebasedChangeset, thisSession.author);

    const correctionChangeset = _correctMarkersInPad(pad.atext, pad.pool);
    if (correctionChangeset) {
      await pad.appendRevision(correctionChangeset);
    }

    // Make sure the pad always ends with an empty line.
    if (pad.text().lastIndexOf('\n') !== pad.text().length - 1) {
      const nlChangeset = Changeset.makeSplice(pad.text(), pad.text().length - 1, 0, '\n');
      await pad.appendRevision(nlChangeset);
    }

    await exports.updatePadClients(pad);
  } catch (err) {
    socket.json.send({disconnect: 'badChangeset'});
    stats.meter('failedChangesets').mark();
    messageLogger.warn(`Failed to apply USER_CHANGES from author ${thisSession.author} ` +
                       `(socket ${socket.id}) on pad ${thisSession.padId}: ${err.stack || err}`);
  } finally {
    stopWatch.end();
  }
};

exports.updatePadClients = async (pad) => {
  // skip this if no-one is on this pad
  const roomSockets = _getRoomSockets(pad.id);
  if (roomSockets.length === 0) return;

  // since all clients usually get the same set of changesets, store them in local cache
  // to remove unnecessary roundtrip to the datalayer
  // NB: note below possibly now accommodated via the change to promises/async
  // TODO: in REAL world, if we're working without datalayer cache,
  // all requests to revisions will be fired
  // BEFORE first result will be landed to our cache object.
  // The solution is to replace parallel processing
  // via async.forEach with sequential for() loop. There is no real
  // benefits of running this in parallel,
  // but benefit of reusing cached revision object is HUGE
  const revCache = {};

  await Promise.all(roomSockets.map(async (socket) => {
    const sessioninfo = sessioninfos[socket.id];
    // The user might have disconnected since _getRoomSockets() was called.
    if (sessioninfo == null) return;

    while (sessioninfo.rev < pad.getHeadRevisionNumber()) {
      const r = sessioninfo.rev + 1;
      let revision = revCache[r];
      if (!revision) {
        revision = await pad.getRevision(r);
        revCache[r] = revision;
      }

      const author = revision.meta.author;
      const revChangeset = revision.changeset;
      const currentTime = revision.meta.timestamp;

      let msg;
      if (author === sessioninfo.author) {
        msg = {type: 'COLLABROOM', data: {type: 'ACCEPT_COMMIT', newRev: r}};
      } else {
        const forWire = Changeset.prepareForWire(revChangeset, pad.pool);
        msg = {
          type: 'COLLABROOM',
          data: {
            type: 'NEW_CHANGES',
            newRev: r,
            changeset: forWire.translated,
            apool: forWire.pool,
            author,
            currentTime,
            timeDelta: currentTime - sessioninfo.time,
          },
        };
      }
      try {
        socket.json.send(msg);
      } catch (err) {
        messageLogger.error(`Failed to notify user of new revision: ${err.stack || err}`);
        return;
      }
      sessioninfo.time = currentTime;
      sessioninfo.rev = r;
    }
  }));
};

/**
 * Copied from the Etherpad Source Code. Don't know what this method does excatly...
 */
const _correctMarkersInPad = (atext, apool) => {
  const text = atext.text;

  // collect char positions of line markers (e.g. bullets) in new atext
  // that aren't at the start of a line
  const badMarkers = [];
  const iter = Changeset.opIterator(atext.attribs);
  let offset = 0;
  while (iter.hasNext()) {
    const op = iter.next();

    const hasMarker = _.find(
        AttributeManager.lineAttributes,
        (attribute) => Changeset.opAttributeValue(op, attribute, apool)) !== undefined;

    if (hasMarker) {
      for (let i = 0; i < op.chars; i++) {
        if (offset > 0 && text.charAt(offset - 1) !== '\n') {
          badMarkers.push(offset);
        }
        offset++;
      }
    } else {
      offset += op.chars;
    }
  }

  if (badMarkers.length === 0) {
    return null;
  }

  // create changeset that removes these bad markers
  offset = 0;

  const builder = Changeset.builder(text.length);

  badMarkers.forEach((pos) => {
    builder.keepText(text.substring(offset, pos));
    builder.remove(1);
    offset = pos + 1;
  });

  return builder.toString();
};

/**
 * Handles a CLIENT_READY. A CLIENT_READY is the first message from the client
 * to the server. The Client sends his token
 * and the pad it wants to enter. The Server answers with the inital values (clientVars) of the pad
 * @param socket the socket.io Socket object for the client
 * @param message the message from the client
 */
const handleClientReady = async (socket, message) => {
  const sessionInfo = sessioninfos[socket.id];
  // Check if the user has already disconnected.
  if (sessionInfo == null) return;
  assert(sessionInfo.author);

  const padIds = await readOnlyManager.getIds(sessionInfo.auth.padID);
  sessionInfo.padId = padIds.padId;
  sessionInfo.readOnlyPadId = padIds.readOnlyPadId;
  sessionInfo.readonly =
      padIds.readonly || !webaccess.userCanModify(sessionInfo.auth.padID, socket.client.request);

  await hooks.aCallAll('clientReady', message); // Deprecated due to awkward context.

  let {colorId: authorColorId, name: authorName} = message.userInfo || {};
  if (authorColorId && !/^#(?:[0-9A-F]{3}){1,2}$/i.test(authorColorId)) {
    messageLogger.warn(`Ignoring invalid colorId in CLIENT_READY message: ${authorColorId}`);
    authorColorId = null;
  }
  await Promise.all([
    authorName && authorManager.setAuthorName(sessionInfo.author, authorName),
    authorColorId && authorManager.setAuthorColorId(sessionInfo.author, authorColorId),
  ]);
  ({colorId: authorColorId, name: authorName} = await authorManager.getAuthor(sessionInfo.author));

  // load the pad-object from the database
  const pad = await padManager.getPad(sessionInfo.padId);

  // these db requests all need the pad object (timestamp of latest revision, author data)
  const authors = pad.getAllAuthors();

  // get timestamp of latest revision needed for timeslider
  const currentTime = await pad.getRevisionDate(pad.getHeadRevisionNumber());

  // get all author data out of the database (in parallel)
  const historicalAuthorData = {};
  await Promise.all(authors.map(async (authorId) => {
    const author = await authorManager.getAuthor(authorId);
    if (!author) {
      messageLogger.error(`There is no author for authorId: ${authorId}. ` +
          'This is possibly related to https://github.com/ether/etherpad-lite/issues/2802');
    } else {
      // Filter author attribs (e.g. don't send author's pads to all clients)
      historicalAuthorData[authorId] = {name: author.name, colorId: author.colorId};
    }
  }));

  // glue the clientVars together, send them and tell the other clients that a new one is there

  // Check if the user has disconnected during any of the above awaits.
  if (sessionInfo !== sessioninfos[socket.id]) return;

  // Check if this author is already on the pad, if yes, kick the other sessions!
  const roomSockets = _getRoomSockets(pad.id);

  for (const otherSocket of roomSockets) {
    // The user shouldn't have joined the room yet, but check anyway just in case.
    if (otherSocket.id === socket.id) continue;
    const sinfo = sessioninfos[otherSocket.id];
    if (sinfo && sinfo.author === sessionInfo.author) {
      // fix user's counter, works on page refresh or if user closes browser window and then rejoins
      sessioninfos[otherSocket.id] = {};
      otherSocket.leave(sessionInfo.padId);
      otherSocket.json.send({disconnect: 'userdup'});
    }
  }

  const {session: {user} = {}} = socket.client.request;
  /* eslint-disable prefer-template -- it doesn't support breaking across multiple lines */
  accessLogger.info(`[${pad.head > 0 ? 'ENTER' : 'CREATE'}]` +
                    ` pad:${sessionInfo.padId}` +
                    ` socket:${socket.id}` +
                    ` IP:${settings.disableIPlogging ? 'ANONYMOUS' : socket.request.ip}` +
                    ` authorID:${sessionInfo.author}` +
                    (user && user.username ? ` username:${user.username}` : ''));
  /* eslint-enable prefer-template */

  if (message.reconnect) {
    // If this is a reconnect, we don't have to send the client the ClientVars again
    // Join the pad and start receiving updates
    socket.join(sessionInfo.padId);

    // Save the revision in sessioninfos, we take the revision from the info the client send to us
    sessionInfo.rev = message.client_rev;

    // During the client reconnect, client might miss some revisions from other clients.
    // By using client revision,
    // this below code sends all the revisions missed during the client reconnect
    const revisionsNeeded = [];
    const changesets = {};

    let startNum = message.client_rev + 1;
    let endNum = pad.getHeadRevisionNumber() + 1;

    const headNum = pad.getHeadRevisionNumber();

    if (endNum > headNum + 1) {
      endNum = headNum + 1;
    }

    if (startNum < 0) {
      startNum = 0;
    }

    for (let r = startNum; r < endNum; r++) {
      revisionsNeeded.push(r);
      changesets[r] = {};
    }

    await Promise.all(revisionsNeeded.map(async (revNum) => {
      const cs = changesets[revNum];
      [cs.changeset, cs.author, cs.timestamp] = await Promise.all([
        pad.getRevisionChangeset(revNum),
        pad.getRevisionAuthor(revNum),
        pad.getRevisionDate(revNum),
      ]);
    }));

    // return pending changesets
    for (const r of revisionsNeeded) {
      const forWire = Changeset.prepareForWire(changesets[r].changeset, pad.pool);
      const wireMsg = {type: 'COLLABROOM',
        data: {type: 'CLIENT_RECONNECT',
          headRev: pad.getHeadRevisionNumber(),
          newRev: r,
          changeset: forWire.translated,
          apool: forWire.pool,
          author: changesets[r].author,
          currentTime: changesets[r].timestamp}};
      socket.json.send(wireMsg);
    }

    if (startNum === endNum) {
      const Msg = {type: 'COLLABROOM',
        data: {type: 'CLIENT_RECONNECT',
          noChanges: true,
          newRev: pad.getHeadRevisionNumber()}};
      socket.json.send(Msg);
    }
  } else {
    // This is a normal first connect
    let atext;
    let apool;
    // prepare all values for the wire, there's a chance that this throws, if the pad is corrupted
    try {
      atext = Changeset.cloneAText(pad.atext);
      const attribsForWire = Changeset.prepareForWire(atext.attribs, pad.pool);
      apool = attribsForWire.pool.toJsonable();
      atext.attribs = attribsForWire.translated;
    } catch (e) {
      messageLogger.error(e.stack || e);
      socket.json.send({disconnect: 'corruptPad'}); // pull the brakes

      return;
    }

    // Warning: never ever send sessionInfo.padId to the client. If the client is read only you
    // would open a security hole 1 swedish mile wide...
    const clientVars = {
      skinName: settings.skinName,
      skinVariants: settings.skinVariants,
      randomVersionString: settings.randomVersionString,
      accountPrivs: {
        maxRevisions: 100,
      },
      automaticReconnectionTimeout: settings.automaticReconnectionTimeout,
      initialRevisionList: [],
      initialOptions: {},
      savedRevisions: pad.getSavedRevisions(),
      collab_client_vars: {
        initialAttributedText: atext,
        clientIp: '127.0.0.1',
        padId: sessionInfo.auth.padID,
        historicalAuthorData,
        apool,
        rev: pad.getHeadRevisionNumber(),
        time: currentTime,
      },
      colorPalette: authorManager.getColorPalette(),
      clientIp: '127.0.0.1',
      userColor: authorColorId,
      padId: sessionInfo.auth.padID,
      padOptions: settings.padOptions,
      padShortcutEnabled: settings.padShortcutEnabled,
      initialTitle: `Pad: ${sessionInfo.auth.padID}`,
      opts: {},
      // tell the client the number of the latest chat-message, which will be
      // used to request the latest 100 chat-messages later (GET_CHAT_MESSAGES)
      chatHead: pad.chatHead,
      numConnectedUsers: roomSockets.length,
      readOnlyId: sessionInfo.readOnlyPadId,
      readonly: sessionInfo.readonly,
      serverTimestamp: Date.now(),
      userId: sessionInfo.author,
      abiwordAvailable: settings.abiwordAvailable(),
      sofficeAvailable: settings.sofficeAvailable(),
      exportAvailable: settings.exportAvailable(),
      plugins: {
        plugins: plugins.plugins,
        parts: plugins.parts,
      },
      indentationOnNewLine: settings.indentationOnNewLine,
      scrollWhenFocusLineIsOutOfViewport: {
        percentage: {
          editionAboveViewport:
              settings.scrollWhenFocusLineIsOutOfViewport.percentage.editionAboveViewport,
          editionBelowViewport:
              settings.scrollWhenFocusLineIsOutOfViewport.percentage.editionBelowViewport,
        },
        duration: settings.scrollWhenFocusLineIsOutOfViewport.duration,
        scrollWhenCaretIsInTheLastLineOfViewport:
            settings.scrollWhenFocusLineIsOutOfViewport.scrollWhenCaretIsInTheLastLineOfViewport,
        percentageToScrollWhenUserPressesArrowUp:
            settings.scrollWhenFocusLineIsOutOfViewport.percentageToScrollWhenUserPressesArrowUp,
      },
      initialChangesets: [], // FIXME: REMOVE THIS SHIT
    };

    // Add a username to the clientVars if one avaiable
    if (authorName != null) {
      clientVars.userName = authorName;
    }

    // call the clientVars-hook so plugins can modify them before they get sent to the client
    const messages = await hooks.aCallAll('clientVars', {clientVars, pad, socket});

    // combine our old object with the new attributes from the hook
    for (const msg of messages) {
      Object.assign(clientVars, msg);
    }

    // Join the pad and start receiving updates
    socket.join(sessionInfo.padId);

    // Send the clientVars to the Client
    socket.json.send({type: 'CLIENT_VARS', data: clientVars});

    // Save the current revision in sessioninfos, should be the same as in clientVars
    sessionInfo.rev = pad.getHeadRevisionNumber();
  }

  // Notify other users about this new user.
  socket.broadcast.to(sessionInfo.padId).json.send({
    type: 'COLLABROOM',
    data: {
      type: 'USER_NEWINFO',
      userInfo: {
        colorId: authorColorId,
        name: authorName,
        userId: sessionInfo.author,
      },
    },
  });

  // Notify this new user about other users.
  await Promise.all(_getRoomSockets(pad.id).map(async (roomSocket) => {
    if (roomSocket.id === socket.id) return;

    // sessioninfos might change while enumerating, so check if the sessionID is still assigned to a
    // valid session.
    const sessionInfo = sessioninfos[roomSocket.id];
    if (sessionInfo == null) return;

    // get the authorname & colorId
    const authorId = sessionInfo.author;
    // The authorId of this other user might be unknown if the other user just connected and has
    // not yet sent a CLIENT_READY message.
    if (authorId == null) return;

    // reuse previously created cache of author's data
    const authorInfo = historicalAuthorData[authorId] || await authorManager.getAuthor(authorId);
    if (authorInfo == null) {
      messageLogger.error(
          `Author ${authorId} connected via socket.io session ${roomSocket.id} is missing from ` +
            'the global author database. This should never happen because the author ID is ' +
            'generated by the same code that adds the author to the database.');
      // Don't bother telling the new user about this mystery author.
      return;
    }

    const msg = {
      type: 'COLLABROOM',
      data: {
        type: 'USER_NEWINFO',
        userInfo: {
          colorId: authorInfo.colorId,
          name: authorInfo.name,
          userId: authorId,
        },
      },
    };

    socket.json.send(msg);
  }));

  await hooks.aCallAll('userJoin', {
    authorId: sessionInfo.author,
    displayName: authorName,
    padId: sessionInfo.padId,
    readOnly: sessionInfo.readonly,
    readOnlyPadId: sessionInfo.readOnlyPadId,
    socket,
  });
};

/**
 * Handles a request for a rough changeset, the timeslider client needs it
 */
const handleChangesetRequest = async (socket, message) => {
  // check if all ok
  if (message.data == null) {
    messageLogger.warn('Dropped message, changeset request has no data!');
    return;
  }

  if (message.data.granularity == null) {
    messageLogger.warn('Dropped message, changeset request has no granularity!');
    return;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger#Polyfill
  if (Math.floor(message.data.granularity) !== message.data.granularity) {
    messageLogger.warn('Dropped message, changeset request granularity is not an integer!');
    return;
  }

  if (message.data.start == null) {
    messageLogger.warn('Dropped message, changeset request has no start!');
    return;
  }

  if (message.data.requestID == null) {
    messageLogger.warn('Dropped message, changeset request has no requestID!');
    return;
  }

  const granularity = message.data.granularity;
  const start = message.data.start;
  const end = start + (100 * granularity);

  const {padId} = sessioninfos[socket.id];

  // build the requested rough changesets and send them back
  try {
    const data = await getChangesetInfo(padId, start, end, granularity);
    data.requestID = message.data.requestID;
    socket.json.send({type: 'CHANGESET_REQ', data});
  } catch (err) {
    messageLogger.error(`Error while handling a changeset request ${message.data} ` +
                        `for ${padId}: ${err.stack || err}`);
  }
};

/**
 * Tries to rebuild the getChangestInfo function of the original Etherpad
 * https://github.com/ether/pad/blob/master/etherpad/src/etherpad/control/pad/pad_changeset_control.js#L144
 */
const getChangesetInfo = async (padId, startNum, endNum, granularity) => {
  const pad = await padManager.getPad(padId);
  const headRevision = pad.getHeadRevisionNumber();

  // calculate the last full endnum
  if (endNum > headRevision + 1) endNum = headRevision + 1;
  endNum = Math.floor(endNum / granularity) * granularity;

  const compositesChangesetNeeded = [];
  const revTimesNeeded = [];

  // figure out which composite Changeset and revTimes we need, to load them in bulk
  for (let start = startNum; start < endNum; start += granularity) {
    const end = start + granularity;

    // add the composite Changeset we needed
    compositesChangesetNeeded.push({start, end});

    // add the t1 time we need
    revTimesNeeded.push(start === 0 ? 0 : start - 1);

    // add the t2 time we need
    revTimesNeeded.push(end - 1);
  }

  // Get all needed db values in parallel.
  const composedChangesets = {};
  const revisionDate = [];
  const [lines] = await Promise.all([
    getPadLines(padId, startNum - 1),
    // Get all needed composite Changesets.
    ...compositesChangesetNeeded.map(async (item) => {
      const changeset = await composePadChangesets(padId, item.start, item.end);
      composedChangesets[`${item.start}/${item.end}`] = changeset;
    }),
    // Get all needed revision Dates.
    ...revTimesNeeded.map(async (revNum) => {
      const revDate = await pad.getRevisionDate(revNum);
      revisionDate[revNum] = Math.floor(revDate / 1000);
    }),
  ]);

  // doesn't know what happens here exactly :/
  const timeDeltas = [];
  const forwardsChangesets = [];
  const backwardsChangesets = [];
  const apool = new AttributePool();

  for (let compositeStart = startNum; compositeStart < endNum; compositeStart += granularity) {
    const compositeEnd = compositeStart + granularity;
    if (compositeEnd > endNum || compositeEnd > headRevision + 1) break;

    const forwards = composedChangesets[`${compositeStart}/${compositeEnd}`];
    const backwards = Changeset.inverse(forwards, lines.textlines, lines.alines, pad.apool());

    Changeset.mutateAttributionLines(forwards, lines.alines, pad.apool());
    Changeset.mutateTextLines(forwards, lines.textlines);

    const forwards2 = Changeset.moveOpsToNewPool(forwards, pad.apool(), apool);
    const backwards2 = Changeset.moveOpsToNewPool(backwards, pad.apool(), apool);

    const t1 = (compositeStart === 0) ? revisionDate[0] : revisionDate[compositeStart - 1];
    const t2 = revisionDate[compositeEnd - 1];

    timeDeltas.push(t2 - t1);
    forwardsChangesets.push(forwards2);
    backwardsChangesets.push(backwards2);
  }

  return {forwardsChangesets, backwardsChangesets,
    apool: apool.toJsonable(), actualEndNum: endNum,
    timeDeltas, start: startNum, granularity};
};

/**
 * Tries to rebuild the getPadLines function of the original Etherpad
 * https://github.com/ether/pad/blob/master/etherpad/src/etherpad/control/pad/pad_changeset_control.js#L263
 */
const getPadLines = async (padId, revNum) => {
  const pad = await padManager.getPad(padId);

  // get the atext
  let atext;

  if (revNum >= 0) {
    atext = await pad.getInternalRevisionAText(revNum);
  } else {
    atext = Changeset.makeAText('\n');
  }

  return {
    textlines: Changeset.splitTextLines(atext.text),
    alines: Changeset.splitAttributionLines(atext.attribs, atext.text),
  };
};

/**
 * Tries to rebuild the composePadChangeset function of the original Etherpad
 * https://github.com/ether/pad/blob/master/etherpad/src/etherpad/control/pad/pad_changeset_control.js#L241
 */
const composePadChangesets = async (padId, startNum, endNum) => {
  const pad = await padManager.getPad(padId);

  // fetch all changesets we need
  const headNum = pad.getHeadRevisionNumber();
  endNum = Math.min(endNum, headNum + 1);
  startNum = Math.max(startNum, 0);

  // create an array for all changesets, we will
  // replace the values with the changeset later
  const changesetsNeeded = [];
  for (let r = startNum; r < endNum; r++) {
    changesetsNeeded.push(r);
  }

  // get all changesets
  const changesets = {};
  await Promise.all(changesetsNeeded.map(
      (revNum) => pad.getRevisionChangeset(revNum)
          .then((changeset) => changesets[revNum] = changeset)
  ));

  // compose Changesets
  let r;
  try {
    let changeset = changesets[startNum];
    const pool = pad.apool();

    for (r = startNum + 1; r < endNum; r++) {
      const cs = changesets[r];
      changeset = Changeset.compose(changeset, cs, pool);
    }
    return changeset;
  } catch (e) {
    // r-1 indicates the rev that was build starting with startNum, applying startNum+1, +2, +3
    messageLogger.warn(
        `failed to compose cs in pad: ${padId} startrev: ${startNum} current rev: ${r}`);
    throw e;
  }
};

const _getRoomSockets = (padID) => {
  const ns = socketio.sockets; // Default namespace.
  const adapter = ns.adapter;
  // We could call adapter.clients(), but that method is unnecessarily asynchronous. Replicate what
  // it does here, but synchronously to avoid a race condition. This code will have to change when
  // we update to socket.io v3.
  const room = adapter.rooms[padID];
  if (!room) return [];
  return Object.keys(room.sockets).map((id) => ns.connected[id]).filter((s) => s);
};

/**
 * Get the number of users in a pad
 */
exports.padUsersCount = (padID) => ({
  padUsersCount: _getRoomSockets(padID).length,
});

/**
 * Get the list of users in a pad
 */
exports.padUsers = async (padID) => {
  const padUsers = [];

  // iterate over all clients (in parallel)
  await Promise.all(_getRoomSockets(padID).map(async (roomSocket) => {
    const s = sessioninfos[roomSocket.id];
    if (s) {
      const author = await authorManager.getAuthor(s.author);
      // Fixes: https://github.com/ether/etherpad-lite/issues/4120
      // On restart author might not be populated?
      if (author) {
        author.id = s.author;
        padUsers.push(author);
      }
    }
  }));

  return {padUsers};
};

exports.sessioninfos = sessioninfos;
