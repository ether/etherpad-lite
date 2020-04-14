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


var padManager = require("../db/PadManager");
var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var AttributePool = require("ep_etherpad-lite/static/js/AttributePool");
var AttributeManager = require("ep_etherpad-lite/static/js/AttributeManager");
var authorManager = require("../db/AuthorManager");
var readOnlyManager = require("../db/ReadOnlyManager");
var settings = require('../utils/Settings');
var securityManager = require("../db/SecurityManager");
var plugins = require("ep_etherpad-lite/static/js/pluginfw/plugins.js");
var log4js = require('log4js');
var messageLogger = log4js.getLogger("message");
var accessLogger = log4js.getLogger("access");
var _ = require('underscore');
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks.js");
var channels = require("channels");
var stats = require('../stats');
var remoteAddress = require("../utils/RemoteAddress").remoteAddress;
const nodeify = require("nodeify");

/**
 * A associative array that saves informations about a session
 * key = sessionId
 * values = padId, readonlyPadId, readonly, author, rev
 *   padId = the real padId of the pad
 *   readonlyPadId = The readonly pad id of the pad
 *   readonly = Wether the client has only read access (true) or read/write access (false)
 *   rev = That last revision that was send to this client
 *   author = the author name of this session
 */
var sessioninfos = {};
exports.sessioninfos = sessioninfos;

// Measure total amount of users
stats.gauge('totalUsers', function() {
  return Object.keys(socketio.sockets.sockets).length;
});

/**
 * A changeset queue per pad that is processed by handleUserChanges()
 */
var padChannels = new channels.channels(function(data, callback) {
  return nodeify(handleUserChanges(data), callback);
});

/**
 * Saves the Socket class we need to send and receive data from the client
 */
let socketio;

/**
 * This Method is called by server.js to tell the message handler on which socket it should send
 * @param socket_io The Socket
 */
exports.setSocketIO = function(socket_io)
{
  socketio=socket_io;
}

/**
 * Handles the connection of a new user
 * @param client the new client
 */
exports.handleConnect = function(client)
{
  stats.meter('connects').mark();

  // Initalize sessioninfos for this new session
  sessioninfos[client.id]={};
}

/**
 * Kicks all sessions from a pad
 * @param client the new client
 */
exports.kickSessionsFromPad = function(padID)
{
  if(typeof socketio.sockets['clients'] !== 'function')
   return;

  // skip if there is nobody on this pad
  if(_getRoomClients(padID).length == 0)
    return;

  // disconnect everyone from this pad
  socketio.sockets.in(padID).json.send({disconnect:"deleted"});
}

/**
 * Handles the disconnection of a user
 * @param client the client that leaves
 */
exports.handleDisconnect = async function(client)
{
  stats.meter('disconnects').mark();

  // save the padname of this session
  let session = sessioninfos[client.id];

  // if this connection was already etablished with a handshake, send a disconnect message to the others
  if (session && session.author) {
    // Get the IP address from our persistant object
    let ip = remoteAddress[client.id];

    // Anonymize the IP address if IP logging is disabled
    if (settings.disableIPlogging) {
      ip = 'ANONYMOUS';
    }

    accessLogger.info('[LEAVE] Pad "' + session.padId + '": Author "' + session.author + '" on client ' + client.id + ' with IP "' + ip + '" left the pad');

    // get the author color out of the db
    let color = await authorManager.getAuthorColorId(session.author);

    // prepare the notification for the other users on the pad, that this user left
    let messageToTheOtherUsers = {
      "type": "COLLABROOM",
      "data": {
        type: "USER_LEAVE",
        userInfo: {
          "ip": "127.0.0.1",
          "colorId": color,
          "userAgent": "Anonymous",
          "userId": session.author
        }
      }
    };

    // Go through all user that are still on the pad, and send them the USER_LEAVE message
    client.broadcast.to(session.padId).json.send(messageToTheOtherUsers);

    // Allow plugins to hook into users leaving the pad
    hooks.callAll("userLeave", session);
  }

  // Delete the sessioninfos entrys of this session
  delete sessioninfos[client.id];
}

/**
 * Handles a message from a user
 * @param client the client that send this message
 * @param message the message from the client
 */
exports.handleMessage = async function(client, message)
{
  if (message == null) {
    return;
  }

  if (!message.type) {
    return;
  }

  let thisSession = sessioninfos[client.id];

  if (!thisSession) {
    messageLogger.warn("Dropped message from an unknown connection.")
    return;
  }

  async function handleMessageHook() {
    // Allow plugins to bypass the readonly message blocker
    let messages = await hooks.aCallAll("handleMessageSecurity", { client: client, message: message });

    for (let message of messages) {
      if (message === true) {
        thisSession.readonly = false;
        break;
      }
    }

    let dropMessage = false;

    // Call handleMessage hook. If a plugin returns null, the message will be dropped. Note that for all messages
    // handleMessage will be called, even if the client is not authorized
    messages = await hooks.aCallAll("handleMessage", { client: client, message: message });
    for (let message of messages) {
      if (message === null ) {
        dropMessage = true;
        break;
      }
    }

    return dropMessage;
  }

  function finalHandler() {
    // Check what type of message we get and delegate to the other methods
    if (message.type == "CLIENT_READY") {
      handleClientReady(client, message);
    } else if (message.type == "CHANGESET_REQ") {
      handleChangesetRequest(client, message);
    } else if(message.type == "COLLABROOM") {
      if (thisSession.readonly) {
        messageLogger.warn("Dropped message, COLLABROOM for readonly pad");
      } else if (message.data.type == "USER_CHANGES") {
        stats.counter('pendingEdits').inc()
        padChannels.emit(message.padId, {client: client, message: message}); // add to pad queue
      } else if (message.data.type == "USERINFO_UPDATE") {
        handleUserInfoUpdate(client, message);
      } else if (message.data.type == "CHAT_MESSAGE") {
        handleChatMessage(client, message);
      } else if (message.data.type == "GET_CHAT_MESSAGES") {
        handleGetChatMessages(client, message);
      } else if (message.data.type == "SAVE_REVISION") {
        handleSaveRevisionMessage(client, message);
      } else if (message.data.type == "CLIENT_MESSAGE" &&
                 message.data.payload != null &&
                 message.data.payload.type == "suggestUserName") {
        handleSuggestUserName(client, message);
      } else {
        messageLogger.warn("Dropped message, unknown COLLABROOM Data  Type " + message.data.type);
      }
    } else if(message.type == "SWITCH_TO_PAD") {
      handleSwitchToPad(client, message);
    } else {
      messageLogger.warn("Dropped message, unknown Message Type " + message.type);
    }
  }

  /*
   * In a previous version of this code, an "if (message)" wrapped the
   * following series of async calls  [now replaced with await calls]
   * This ugly "!Boolean(message)" is a lame way to exactly negate the truthy
   * condition and replace it with an early return, while being sure to leave
   * the original behaviour unchanged.
   *
   * A shallower code could maybe make more evident latent logic errors.
   */
  if (!Boolean(message)) {
    return;
  }

  let dropMessage = await handleMessageHook();
  if (!dropMessage) {

    // check permissions

    if (message.type == "CLIENT_READY") {
      // client tried to auth for the first time (first msg from the client)
      createSessionInfo(client, message);
    }

    // Note: message.sessionID is an entirely different kind of
    // session from the sessions we use here! Beware!
    // FIXME: Call our "sessions" "connections".
    // FIXME: Use a hook instead
    // FIXME: Allow to override readwrite access with readonly

    // the session may have been dropped during earlier processing
    if (!sessioninfos[client.id]) {
      messageLogger.warn("Dropping message from a connection that has gone away.")
      return;
    }

    // Simulate using the load testing tool
    if (!sessioninfos[client.id].auth) {
      console.error("Auth was never applied to a session.  If you are using the stress-test tool then restart Etherpad and the Stress test tool.")
      return;
    }

    let auth = sessioninfos[client.id].auth;

    // check if pad is requested via readOnly
    let padId = auth.padID;

    if (padId.indexOf("r.") === 0) {
      // Pad is readOnly, first get the real Pad ID
      padId = await readOnlyManager.getPadId(padId);
    }

    let { accessStatus } = await securityManager.checkAccess(padId, auth.sessionID, auth.token, auth.password);

    if (accessStatus !== "grant") {
      // no access, send the client a message that tells him why
      client.json.send({ accessStatus });
      return;
    }

    // access was granted
    finalHandler();
  }
}


/**
 * Handles a save revision message
 * @param client the client that send this message
 * @param message the message from the client
 */
async function handleSaveRevisionMessage(client, message)
{
  var padId = sessioninfos[client.id].padId;
  var userId = sessioninfos[client.id].author;

  let pad = await padManager.getPad(padId);
  pad.addSavedRevision(pad.head, userId);
}

/**
 * Handles a custom message, different to the function below as it handles
 * objects not strings and you can direct the message to specific sessionID
 *
 * @param msg {Object} the message we're sending
 * @param sessionID {string} the socketIO session to which we're sending this message
 */
exports.handleCustomObjectMessage = function(msg, sessionID) {
  if (msg.data.type === "CUSTOM") {
    if (sessionID){
      // a sessionID is targeted: directly to this sessionID
      socketio.sockets.socket(sessionID).json.send(msg);
    } else {
      // broadcast to all clients on this pad
      socketio.sockets.in(msg.data.payload.padId).json.send(msg);
    }
  }
}

/**
 * Handles a custom message (sent via HTTP API request)
 *
 * @param padID {Pad} the pad to which we're sending this message
 * @param msgString {String} the message we're sending
 */
exports.handleCustomMessage = function(padID, msgString) {
  let time = Date.now();
  let msg = {
    type: 'COLLABROOM',
    data: {
      type: msgString,
      time: time
    }
  };
  socketio.sockets.in(padID).json.send(msg);
}

/**
 * Handles a Chat Message
 * @param client the client that send this message
 * @param message the message from the client
 */
function handleChatMessage(client, message)
{
  var time = Date.now();
  var userId = sessioninfos[client.id].author;
  var text = message.data.text;
  var padId = sessioninfos[client.id].padId;

  exports.sendChatMessageToPadClients(time, userId, text, padId);
}

/**
 * Sends a chat message to all clients of this pad
 * @param time the timestamp of the chat message
 * @param userId the author id of the chat message
 * @param text the text of the chat message
 * @param padId the padId to send the chat message to
 */
exports.sendChatMessageToPadClients = async function(time, userId, text, padId)
{
  // get the pad
  let pad = await padManager.getPad(padId);

  // get the author
  let userName = await authorManager.getAuthorName(userId);

  // save the chat message
  pad.appendChatMessage(text, userId, time);

  let msg = {
    type: "COLLABROOM",
    data: { type: "CHAT_MESSAGE", userId, userName, time, text }
  };

  // broadcast the chat message to everyone on the pad
  socketio.sockets.in(padId).json.send(msg);
}

/**
 * Handles the clients request for more chat-messages
 * @param client the client that send this message
 * @param message the message from the client
 */
async function handleGetChatMessages(client, message)
{
  if (message.data.start == null) {
    messageLogger.warn("Dropped message, GetChatMessages Message has no start!");
    return;
  }

  if (message.data.end == null) {
    messageLogger.warn("Dropped message, GetChatMessages Message has no start!");
    return;
  }

  let start = message.data.start;
  let end = message.data.end;
  let count = end - start;

  if (count < 0 || count > 100) {
    messageLogger.warn("Dropped message, GetChatMessages Message, client requested invalid amount of messages!");
    return;
  }

  let padId = sessioninfos[client.id].padId;
  let pad = await padManager.getPad(padId);

  let chatMessages = await pad.getChatMessages(start, end);
  let infoMsg = {
    type: "COLLABROOM",
    data: {
      type: "CHAT_MESSAGES",
      messages: chatMessages
    }
  };

  // send the messages back to the client
  client.json.send(infoMsg);
}

/**
 * Handles a handleSuggestUserName, that means a user have suggest a userName for a other user
 * @param client the client that send this message
 * @param message the message from the client
 */
function handleSuggestUserName(client, message)
{
  // check if all ok
  if (message.data.payload.newName == null) {
    messageLogger.warn("Dropped message, suggestUserName Message has no newName!");
    return;
  }

  if (message.data.payload.unnamedId == null) {
    messageLogger.warn("Dropped message, suggestUserName Message has no unnamedId!");
    return;
  }

  var padId = sessioninfos[client.id].padId;
  var roomClients = _getRoomClients(padId);

  // search the author and send him this message
  roomClients.forEach(function(client) {
    var session = sessioninfos[client.id];
    if (session && session.author == message.data.payload.unnamedId) {
      client.json.send(message);
    }
  });
}

/**
 * Handles a USERINFO_UPDATE, that means that a user have changed his color or name. Anyway, we get both informations
 * @param client the client that send this message
 * @param message the message from the client
 */
function handleUserInfoUpdate(client, message)
{
  // check if all ok
  if (message.data.userInfo == null) {
    messageLogger.warn("Dropped message, USERINFO_UPDATE Message has no userInfo!");
    return;
  }

  if (message.data.userInfo.colorId == null) {
    messageLogger.warn("Dropped message, USERINFO_UPDATE Message has no colorId!");
    return;
  }

  // Check that we have a valid session and author to update.
  var session = sessioninfos[client.id];
  if (!session || !session.author || !session.padId) {
    messageLogger.warn("Dropped message, USERINFO_UPDATE Session not ready." + message.data);
    return;
  }

  // Find out the author name of this session
  var author = session.author;

  // Check colorId is a Hex color
  var isColor  = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(message.data.userInfo.colorId) // for #f00 (Thanks Smamatti)
  if (!isColor) {
    messageLogger.warn("Dropped message, USERINFO_UPDATE Color is malformed." + message.data);
    return;
  }

  // Tell the authorManager about the new attributes
  authorManager.setAuthorColorId(author, message.data.userInfo.colorId);
  authorManager.setAuthorName(author, message.data.userInfo.name);

  var padId = session.padId;

  var infoMsg = {
    type: "COLLABROOM",
    data: {
      // The Client doesn't know about USERINFO_UPDATE, use USER_NEWINFO
      type: "USER_NEWINFO",
      userInfo: {
        userId: author,
        // set a null name, when there is no name set. cause the client wants it null
        name: message.data.userInfo.name || null,
        colorId: message.data.userInfo.colorId,
        userAgent: "Anonymous",
        ip: "127.0.0.1",
      }
    }
  };

  // Send the other clients on the pad the update message
  client.broadcast.to(padId).json.send(infoMsg);
}

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
 * @param client the client that send this message
 * @param message the message from the client
 */
async function handleUserChanges(data)
{
  var client = data.client
    , message = data.message

  // This one's no longer pending, as we're gonna process it now
  stats.counter('pendingEdits').dec()

  // Make sure all required fields are present
  if (message.data.baseRev == null) {
    messageLogger.warn("Dropped message, USER_CHANGES Message has no baseRev!");
    return;
  }

  if (message.data.apool == null) {
    messageLogger.warn("Dropped message, USER_CHANGES Message has no apool!");
    return;
  }

  if (message.data.changeset == null) {
    messageLogger.warn("Dropped message, USER_CHANGES Message has no changeset!");
    return;
  }

  // TODO: this might happen with other messages too => find one place to copy the session
  // and always use the copy. atm a message will be ignored if the session is gone even
  // if the session was valid when the message arrived in the first place
  if (!sessioninfos[client.id]) {
    messageLogger.warn("Dropped message, disconnect happened in the mean time");
    return;
  }

  // get all Vars we need
  var baseRev = message.data.baseRev;
  var wireApool = (new AttributePool()).fromJsonable(message.data.apool);
  var changeset = message.data.changeset;

  // The client might disconnect between our callbacks. We should still
  // finish processing the changeset, so keep a reference to the session.
  var thisSession = sessioninfos[client.id];

  // Measure time to process edit
  var stopWatch = stats.timer('edits').start();

  // get the pad
  let pad = await padManager.getPad(thisSession.padId);

  // create the changeset
  try {
    try {
      // Verify that the changeset has valid syntax and is in canonical form
      Changeset.checkRep(changeset);

      // Verify that the attribute indexes used in the changeset are all
      // defined in the accompanying attribute pool.
      Changeset.eachAttribNumber(changeset, function(n) {
        if (!wireApool.getAttrib(n)) {
          throw new Error("Attribute pool is missing attribute " + n + " for changeset " + changeset);
        }
      });

      // Validate all added 'author' attribs to be the same value as the current user
      var iterator = Changeset.opIterator(Changeset.unpack(changeset).ops)
        , op;

      while (iterator.hasNext()) {
        op = iterator.next()

        // + can add text with attribs
        // = can change or add attribs
        // - can have attribs, but they are discarded and don't show up in the attribs - but do show up in the  pool

        op.attribs.split('*').forEach(function(attr) {
          if (!attr) return;

          attr = wireApool.getAttrib(attr);
          if (!attr) return;

          // the empty author is used in the clearAuthorship functionality so this should be the only exception
          if ('author' == attr[0] && (attr[1] != thisSession.author && attr[1] != '')) {
            throw new Error("Trying to submit changes as another author in changeset " + changeset);
          }
        });
      }

      // ex. adoptChangesetAttribs

      // Afaik, it copies the new attributes from the changeset, to the global Attribute Pool
      changeset = Changeset.moveOpsToNewPool(changeset, wireApool, pad.pool);

    } catch(e) {
      // There is an error in this changeset, so just refuse it
      client.json.send({ disconnect: "badChangeset" });
      stats.meter('failedChangesets').mark();
      throw new Error("Can't apply USER_CHANGES, because " + e.message);
    }

    // ex. applyUserChanges
    let apool = pad.pool;
    let r = baseRev;

    // The client's changeset might not be based on the latest revision,
    // since other clients are sending changes at the same time.
    // Update the changeset so that it can be applied to the latest revision.
    while (r < pad.getHeadRevisionNumber()) {
      r++;

      let c = await pad.getRevisionChangeset(r);

      // At this point, both "c" (from the pad) and "changeset" (from the
      // client) are relative to revision r - 1. The follow function
      // rebases "changeset" so that it is relative to revision r
      // and can be applied after "c".

      try {
        // a changeset can be based on an old revision with the same changes in it
        // prevent eplite from accepting it TODO: better send the client a NEW_CHANGES
        // of that revision
        if (baseRev + 1 == r && c == changeset) {
          client.json.send({disconnect:"badChangeset"});
          stats.meter('failedChangesets').mark();
          throw new Error("Won't apply USER_CHANGES, because it contains an already accepted changeset");
        }

        changeset = Changeset.follow(c, changeset, false, apool);
      } catch(e) {
        client.json.send({disconnect:"badChangeset"});
        stats.meter('failedChangesets').mark();
        throw new Error("Can't apply USER_CHANGES, because " + e.message);
      }
    }

    let prevText = pad.text();

    if (Changeset.oldLen(changeset) != prevText.length) {
      client.json.send({disconnect:"badChangeset"});
      stats.meter('failedChangesets').mark();
      throw new Error("Can't apply USER_CHANGES "+changeset+" with oldLen " + Changeset.oldLen(changeset) + " to document of length " + prevText.length);
    }

    try {
      pad.appendRevision(changeset, thisSession.author);
    } catch(e) {
      client.json.send({ disconnect: "badChangeset" });
      stats.meter('failedChangesets').mark();
      throw e;
    }

    let correctionChangeset = _correctMarkersInPad(pad.atext, pad.pool);
    if (correctionChangeset) {
      pad.appendRevision(correctionChangeset);
    }

    // Make sure the pad always ends with an empty line.
    if (pad.text().lastIndexOf("\n") != pad.text().length-1) {
      var nlChangeset = Changeset.makeSplice(pad.text(), pad.text().length - 1, 0, "\n");
      pad.appendRevision(nlChangeset);
    }

    await exports.updatePadClients(pad);
  } catch (err) {
    console.warn(err.stack || err);
  }

  stopWatch.end();
}

exports.updatePadClients = async function(pad)
{
  // skip this if no-one is on this pad
  let roomClients = _getRoomClients(pad.id);

  if (roomClients.length == 0) {
    return;
  }

  // since all clients usually get the same set of changesets, store them in local cache
  // to remove unnecessary roundtrip to the datalayer
  // NB: note below possibly now accommodated via the change to promises/async
  // TODO: in REAL world, if we're working without datalayer cache, all requests to revisions will be fired
  // BEFORE first result will be landed to our cache object. The solution is to replace parallel processing
  // via async.forEach with sequential for() loop. There is no real benefits of running this in parallel,
  // but benefit of reusing cached revision object is HUGE
  let revCache = {};

  // go through all sessions on this pad
  for (let client of roomClients) {
    let sid = client.id;

    // send them all new changesets
    while (sessioninfos[sid] && sessioninfos[sid].rev < pad.getHeadRevisionNumber()) {
      let r = sessioninfos[sid].rev + 1;
      let revision = revCache[r];
      if (!revision) {
        revision = await pad.getRevision(r);
        revCache[r] = revision;
      }

      let author = revision.meta.author,
          revChangeset = revision.changeset,
          currentTime = revision.meta.timestamp;

      // next if session has not been deleted
      if (sessioninfos[sid] == null) {
        continue;
      }

      if (author == sessioninfos[sid].author) {
        client.json.send({ "type": "COLLABROOM", "data":{ type: "ACCEPT_COMMIT", newRev: r }});
      } else {
        let forWire = Changeset.prepareForWire(revChangeset, pad.pool);
        let wireMsg = {"type": "COLLABROOM",
                       "data": { type:"NEW_CHANGES",
                                 newRev:r,
                                 changeset: forWire.translated,
                                 apool: forWire.pool,
                                 author: author,
                                 currentTime: currentTime,
                                 timeDelta: currentTime - sessioninfos[sid].time
                               }};

        client.json.send(wireMsg);
      }

      if (sessioninfos[sid]) {
        sessioninfos[sid].time = currentTime;
        sessioninfos[sid].rev = r;
      }
    }
  }
}

/**
 * Copied from the Etherpad Source Code. Don't know what this method does excatly...
 */
function _correctMarkersInPad(atext, apool) {
  var text = atext.text;

  // collect char positions of line markers (e.g. bullets) in new atext
  // that aren't at the start of a line
  var badMarkers = [];
  var iter = Changeset.opIterator(atext.attribs);
  var offset = 0;
  while (iter.hasNext()) {
    var op = iter.next();

    var hasMarker = _.find(AttributeManager.lineAttributes, function(attribute) {
      return Changeset.opAttributeValue(op, attribute, apool);
    }) !== undefined;

    if (hasMarker) {
      for (var i = 0; i < op.chars; i++) {
        if (offset > 0 && text.charAt(offset-1) != '\n') {
          badMarkers.push(offset);
        }
        offset++;
      }
    } else {
      offset += op.chars;
    }
  }

  if (badMarkers.length == 0) {
    return null;
  }

  // create changeset that removes these bad markers
  offset = 0;

  var builder = Changeset.builder(text.length);

  badMarkers.forEach(function(pos) {
    builder.keepText(text.substring(offset, pos));
    builder.remove(1);
    offset = pos+1;
  });

  return builder.toString();
}

function handleSwitchToPad(client, message)
{
  // clear the session and leave the room
  let currentSession = sessioninfos[client.id];
  let padId = currentSession.padId;
  let roomClients = _getRoomClients(padId);

  roomClients.forEach(client => {
    let sinfo = sessioninfos[client.id];
    if (sinfo && sinfo.author == currentSession.author) {
      // fix user's counter, works on page refresh or if user closes browser window and then rejoins
      sessioninfos[client.id] = {};
      client.leave(padId);
    }
  });

  // start up the new pad
  createSessionInfo(client, message);
  handleClientReady(client, message);
}

function createSessionInfo(client, message)
{
  // Remember this information since we won't
  // have the cookie in further socket.io messages.
  // This information will be used to check if
  // the sessionId of this connection is still valid
  // since it could have been deleted by the API.
  sessioninfos[client.id].auth =
  {
    sessionID: message.sessionID,
    padID: message.padId,
    token : message.token,
    password: message.password
  };
}

/**
 * Handles a CLIENT_READY. A CLIENT_READY is the first message from the client to the server. The Client sends his token
 * and the pad it wants to enter. The Server answers with the inital values (clientVars) of the pad
 * @param client the client that send this message
 * @param message the message from the client
 */
async function handleClientReady(client, message)
{
  // check if all ok
  if (!message.token) {
    messageLogger.warn("Dropped message, CLIENT_READY Message has no token!");
    return;
  }

  if (!message.padId) {
    messageLogger.warn("Dropped message, CLIENT_READY Message has no padId!");
    return;
  }

  if (!message.protocolVersion) {
    messageLogger.warn("Dropped message, CLIENT_READY Message has no protocolVersion!");
    return;
  }

  if (message.protocolVersion != 2) {
    messageLogger.warn("Dropped message, CLIENT_READY Message has a unknown protocolVersion '" + message.protocolVersion + "'!");
    return;
  }

  hooks.callAll("clientReady", message);

  // Get ro/rw id:s
  let padIds = await readOnlyManager.getIds(message.padId);

  // check permissions

  // Note: message.sessionID is an entierly different kind of
  // session from the sessions we use here! Beware!
  // FIXME: Call our "sessions" "connections".
  // FIXME: Use a hook instead
  // FIXME: Allow to override readwrite access with readonly
  let statusObject = await securityManager.checkAccess(padIds.padId, message.sessionID, message.token, message.password);
  let accessStatus = statusObject.accessStatus;

  // no access, send the client a message that tells him why
  if (accessStatus !== "grant") {
    client.json.send({ accessStatus });
    return;
  }

  let author = statusObject.authorID;

  // get all authordata of this new user
  let value = await authorManager.getAuthor(author);
  let authorColorId = value.colorId;
  let authorName = value.name;

  // load the pad-object from the database
  let pad = await padManager.getPad(padIds.padId);

  // these db requests all need the pad object (timestamp of latest revision, author data)
  let authors = pad.getAllAuthors();

  // get timestamp of latest revision needed for timeslider
  let currentTime = await pad.getRevisionDate(pad.getHeadRevisionNumber());

  // get all author data out of the database (in parallel)
  let historicalAuthorData = {};
  await Promise.all(authors.map(authorId => {
    return authorManager.getAuthor(authorId).then(author => {
      if (!author) {
        messageLogger.error("There is no author for authorId: ", authorId, ". This is possibly related to https://github.com/ether/etherpad-lite/issues/2802");
      } else {
        historicalAuthorData[authorId] = { name: author.name, colorId: author.colorId }; // Filter author attribs (e.g. don't send author's pads to all clients)
      }
    });
  }));

  let thisUserHasEditedThisPad = false;
  if (historicalAuthorData[statusObject.authorID]) {
    /*
     * This flag is set to true when a user contributes to a specific pad for
     * the first time. It is used for deciding if importing to that pad is
     * allowed or not.
     */
    thisUserHasEditedThisPad = true;
  }

  // glue the clientVars together, send them and tell the other clients that a new one is there

  // Check that the client is still here. It might have disconnected between callbacks.
  if (sessioninfos[client.id] === undefined) {
    return;
  }

  // Check if this author is already on the pad, if yes, kick the other sessions!
  let roomClients = _getRoomClients(pad.id);

  for (let client of roomClients) {
    let sinfo = sessioninfos[client.id];
    if (sinfo && sinfo.author == author) {
      // fix user's counter, works on page refresh or if user closes browser window and then rejoins
      sessioninfos[client.id] = {};
      client.leave(padIds.padId);
      client.json.send({disconnect:"userdup"});
    }
  }

  // Save in sessioninfos that this session belonges to this pad
  sessioninfos[client.id].padId = padIds.padId;
  sessioninfos[client.id].readOnlyPadId = padIds.readOnlyPadId;
  sessioninfos[client.id].readonly = padIds.readonly;

  // Log creation/(re-)entering of a pad
  let ip = remoteAddress[client.id];

  // Anonymize the IP address if IP logging is disabled
  if (settings.disableIPlogging) {
    ip = 'ANONYMOUS';
  }

  if (pad.head > 0) {
    accessLogger.info('[ENTER] Pad "' + padIds.padId + '": Client ' + client.id + ' with IP "' + ip + '" entered the pad');
  } else if (pad.head == 0) {
    accessLogger.info('[CREATE] Pad "' + padIds.padId + '": Client ' + client.id + ' with IP "' + ip + '" created the pad');
  }

  if (message.reconnect) {
    // If this is a reconnect, we don't have to send the client the ClientVars again
    // Join the pad and start receiving updates
    client.join(padIds.padId);

    // Save the revision in sessioninfos, we take the revision from the info the client send to us
    sessioninfos[client.id].rev = message.client_rev;

    // During the client reconnect, client might miss some revisions from other clients. By using client revision,
    // this below code sends all the revisions missed during the client reconnect
    var revisionsNeeded = [];
    var changesets = {};

    var startNum = message.client_rev + 1;
    var endNum = pad.getHeadRevisionNumber() + 1;

    var headNum = pad.getHeadRevisionNumber();

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

    // get changesets, author and timestamp needed for pending revisions (in parallel)
    let promises = [];
    for (let revNum of revisionsNeeded) {
       let cs = changesets[revNum];
       promises.push( pad.getRevisionChangeset(revNum).then(result => cs.changeset = result ));
       promises.push(    pad.getRevisionAuthor(revNum).then(result => cs.author = result    ));
       promises.push(      pad.getRevisionDate(revNum).then(result => cs.timestamp = result ));
    }
    await Promise.all(promises);

    // return pending changesets
    for (let r of revisionsNeeded) {

      let forWire = Changeset.prepareForWire(changesets[r]['changeset'], pad.pool);
      let wireMsg = {"type":"COLLABROOM",
                     "data":{type:"CLIENT_RECONNECT",
                             headRev:pad.getHeadRevisionNumber(),
                             newRev:r,
                             changeset:forWire.translated,
                             apool: forWire.pool,
                             author: changesets[r]['author'],
                             currentTime: changesets[r]['timestamp']
                           }};
      client.json.send(wireMsg);
    }

    if (startNum == endNum) {
      var Msg = {"type":"COLLABROOM",
                 "data":{type:"CLIENT_RECONNECT",
                         noChanges: true,
                         newRev: pad.getHeadRevisionNumber()
                 }};
      client.json.send(Msg);
    }

  } else {
    // This is a normal first connect

    // prepare all values for the wire, there's a chance that this throws, if the pad is corrupted
    try {
      var atext = Changeset.cloneAText(pad.atext);
      var attribsForWire = Changeset.prepareForWire(atext.attribs, pad.pool);
      var apool = attribsForWire.pool.toJsonable();
      atext.attribs = attribsForWire.translated;
    } catch(e) {
      console.error(e.stack || e)
      client.json.send({ disconnect:"corruptPad" }); // pull the brakes

      return;
    }

    // Warning: never ever send padIds.padId to the client. If the
    // client is read only you would open a security hole 1 swedish
    // mile wide...
    var clientVars = {
      "skinName": settings.skinName,
      "skinVariants": settings.skinVariants,
      "accountPrivs": {
          "maxRevisions": 100
      },
      "automaticReconnectionTimeout": settings.automaticReconnectionTimeout,
      "initialRevisionList": [],
      "initialOptions": {
          "guestPolicy": "deny"
      },
      "savedRevisions": pad.getSavedRevisions(),
      "collab_client_vars": {
          "initialAttributedText": atext,
          "clientIp": "127.0.0.1",
          "padId": message.padId,
          "historicalAuthorData": historicalAuthorData,
          "apool": apool,
          "rev": pad.getHeadRevisionNumber(),
          "time": currentTime,
      },
      "colorPalette": authorManager.getColorPalette(),
      "clientIp": "127.0.0.1",
      "userIsGuest": true,
      "userColor": authorColorId,
      "padId": message.padId,
      "padOptions": settings.padOptions,
      "padShortcutEnabled": settings.padShortcutEnabled,
      "initialTitle": "Pad: " + message.padId,
      "opts": {},
      // tell the client the number of the latest chat-message, which will be
      // used to request the latest 100 chat-messages later (GET_CHAT_MESSAGES)
      "chatHead": pad.chatHead,
      "numConnectedUsers": roomClients.length,
      "readOnlyId": padIds.readOnlyPadId,
      "readonly": padIds.readonly,
      "serverTimestamp": Date.now(),
      "userId": author,
      "abiwordAvailable": settings.abiwordAvailable(),
      "sofficeAvailable": settings.sofficeAvailable(),
      "exportAvailable": settings.exportAvailable(),
      "plugins": {
        "plugins": plugins.plugins,
        "parts": plugins.parts,
      },
      "indentationOnNewLine": settings.indentationOnNewLine,
      "scrollWhenFocusLineIsOutOfViewport": {
        "percentage" : {
          "editionAboveViewport": settings.scrollWhenFocusLineIsOutOfViewport.percentage.editionAboveViewport,
          "editionBelowViewport": settings.scrollWhenFocusLineIsOutOfViewport.percentage.editionBelowViewport,
        },
        "duration": settings.scrollWhenFocusLineIsOutOfViewport.duration,
        "scrollWhenCaretIsInTheLastLineOfViewport": settings.scrollWhenFocusLineIsOutOfViewport.scrollWhenCaretIsInTheLastLineOfViewport,
        "percentageToScrollWhenUserPressesArrowUp": settings.scrollWhenFocusLineIsOutOfViewport.percentageToScrollWhenUserPressesArrowUp,
      },
      "initialChangesets": [], // FIXME: REMOVE THIS SHIT
      "thisUserHasEditedThisPad": thisUserHasEditedThisPad,
    }

    // Add a username to the clientVars if one avaiable
    if (authorName != null) {
      clientVars.userName = authorName;
    }

    // call the clientVars-hook so plugins can modify them before they get sent to the client
    let messages = await hooks.aCallAll("clientVars", { clientVars: clientVars, pad: pad });

    // combine our old object with the new attributes from the hook
    for (let msg of messages) {
      Object.assign(clientVars, msg);
    }

    // Join the pad and start receiving updates
    client.join(padIds.padId);

    // Send the clientVars to the Client
    client.json.send({type: "CLIENT_VARS", data: clientVars});

    // Save the current revision in sessioninfos, should be the same as in clientVars
    sessioninfos[client.id].rev = pad.getHeadRevisionNumber();

    sessioninfos[client.id].author = author;

    // prepare the notification for the other users on the pad, that this user joined
    let messageToTheOtherUsers = {
       "type": "COLLABROOM",
       "data": {
        type: "USER_NEWINFO",
        userInfo: {
          "ip": "127.0.0.1",
          "colorId": authorColorId,
          "userAgent": "Anonymous",
          "userId": author
        }
      }
    };

    // Add the authorname of this new User, if avaiable
    if (authorName != null) {
      messageToTheOtherUsers.data.userInfo.name = authorName;
    }

    // notify all existing users about new user
    client.broadcast.to(padIds.padId).json.send(messageToTheOtherUsers);

    // Get sessions for this pad and update them (in parallel)
    roomClients = _getRoomClients(pad.id);
    await Promise.all(_getRoomClients(pad.id).map(async roomClient => {

      // Jump over, if this session is the connection session
      if (roomClient.id == client.id) {
        return;
      }

      // Since sessioninfos might change while being enumerated, check if the
      // sessionID is still assigned to a valid session
      if (sessioninfos[roomClient.id] === undefined) {
        return;
      }

      // get the authorname & colorId
      let author = sessioninfos[roomClient.id].author;
      let cached = historicalAuthorData[author];

      // reuse previously created cache of author's data
      let p = cached ? Promise.resolve(cached) : authorManager.getAuthor(author);

      return p.then(authorInfo => {
        // default fallback color to use if authorInfo.colorId is null
        const defaultColor = "#daf0b2";

        if (!authorInfo) {
          console.warn(`handleClientReady(): no authorInfo parameter was received. Default values are going to be used. See issue #3612.  This can be caused by a user clicking undo after clearing all authorship colors see #2802`);
          authorInfo = {};
        }

        // For some reason sometimes name isn't set
        // Catch this issue here and use a fixed name.
        if (!authorInfo.name) {
          console.warn(`handleClientReady(): client submitted no author name. Using "Anonymous". See: issue #3612`);
          authorInfo.name = "Anonymous";
        }

        // For some reason sometimes colorId isn't set
        // Catch this issue here and use a fixed color.
        if (!authorInfo.colorId) {
          console.warn(`handleClientReady(): author "${authorInfo.name}" has no property colorId. Using the default color ${defaultColor}. See issue #3612`);
          authorInfo.colorId = defaultColor;
        }

        // Send the new User a Notification about this other user
        let msg = {
          "type": "COLLABROOM",
          "data": {
            type: "USER_NEWINFO",
            userInfo: {
              "ip": "127.0.0.1",
              "colorId": authorInfo.colorId,
              "name": authorInfo.name,
              "userAgent": "Anonymous",
              "userId": author
            }
          }
        };

        client.json.send(msg);
      });
    }));
  }
}

/**
 * Handles a request for a rough changeset, the timeslider client needs it
 */
async function handleChangesetRequest(client, message)
{
  // check if all ok
  if (message.data == null) {
    messageLogger.warn("Dropped message, changeset request has no data!");
    return;
  }

  if (message.padId == null) {
    messageLogger.warn("Dropped message, changeset request has no padId!");
    return;
  }

  if (message.data.granularity == null) {
    messageLogger.warn("Dropped message, changeset request has no granularity!");
    return;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger#Polyfill
  if (Math.floor(message.data.granularity) !== message.data.granularity) {
    messageLogger.warn("Dropped message, changeset request granularity is not an integer!");
    return;
  }

  if (message.data.start == null) {
    messageLogger.warn("Dropped message, changeset request has no start!");
    return;
  }

  if (message.data.requestID == null) {
    messageLogger.warn("Dropped message, changeset request has no requestID!");
    return;
  }

  let granularity = message.data.granularity;
  let start = message.data.start;
  let end = start + (100 * granularity);

  let padIds = await readOnlyManager.getIds(message.padId);

  // build the requested rough changesets and send them back
  try {
    let data = await getChangesetInfo(padIds.padId, start, end, granularity);
    data.requestID = message.data.requestID;
    client.json.send({ type: "CHANGESET_REQ", data });
  } catch (err) {
    console.error('Error while handling a changeset request for ' + padIds.padId, err, message.data);
  }
}

/**
 * Tries to rebuild the getChangestInfo function of the original Etherpad
 * https://github.com/ether/pad/blob/master/etherpad/src/etherpad/control/pad/pad_changeset_control.js#L144
 */
async function getChangesetInfo(padId, startNum, endNum, granularity)
{
  let pad = await padManager.getPad(padId);
  let head_revision = pad.getHeadRevisionNumber();

  // calculate the last full endnum
  if (endNum > head_revision + 1) {
    endNum = head_revision + 1;
  }
  endNum = Math.floor(endNum / granularity) * granularity;

  let compositesChangesetNeeded = [];
  let revTimesNeeded = [];

  // figure out which composite Changeset and revTimes we need, to load them in bulk
  for (let start = startNum; start < endNum; start += granularity) {
    let end = start + granularity;

    // add the composite Changeset we needed
    compositesChangesetNeeded.push({ start, end });

    // add the t1 time we need
    revTimesNeeded.push(start == 0 ? 0 : start - 1);

    // add the t2 time we need
    revTimesNeeded.push(end - 1);
  }

  // get all needed db values parallel - no await here since
  // it would make all the lookups run in series

  // get all needed composite Changesets
  let composedChangesets = {};
  let p1 = Promise.all(compositesChangesetNeeded.map(item => {
    return composePadChangesets(padId, item.start, item.end).then(changeset => {
      composedChangesets[item.start + "/" + item.end] = changeset;
    });
  }));

  // get all needed revision Dates
  let revisionDate = [];
  let p2 = Promise.all(revTimesNeeded.map(revNum => {
    return pad.getRevisionDate(revNum).then(revDate => {
      revisionDate[revNum] = Math.floor(revDate / 1000);
    });
  }));

  // get the lines
  let lines;
  let p3 = getPadLines(padId, startNum - 1).then(_lines => {
    lines = _lines;
  });

  // wait for all of the above to complete
  await Promise.all([p1, p2, p3]);

  // doesn't know what happens here exactly :/
  let timeDeltas = [];
  let forwardsChangesets = [];
  let backwardsChangesets = [];
  let apool = new AttributePool();

  for (let compositeStart = startNum; compositeStart < endNum; compositeStart += granularity) {
    let compositeEnd = compositeStart + granularity;
    if (compositeEnd > endNum || compositeEnd > head_revision + 1) {
      break;
    }

    let forwards = composedChangesets[compositeStart + "/" + compositeEnd];
    let backwards = Changeset.inverse(forwards, lines.textlines, lines.alines, pad.apool());

    Changeset.mutateAttributionLines(forwards, lines.alines, pad.apool());
    Changeset.mutateTextLines(forwards, lines.textlines);

    let forwards2 = Changeset.moveOpsToNewPool(forwards, pad.apool(), apool);
    let backwards2 = Changeset.moveOpsToNewPool(backwards, pad.apool(), apool);

    let t1 = (compositeStart == 0) ? revisionDate[0] : revisionDate[compositeStart - 1];
    let t2 = revisionDate[compositeEnd - 1];

    timeDeltas.push(t2 - t1);
    forwardsChangesets.push(forwards2);
    backwardsChangesets.push(backwards2);
  }

  return { forwardsChangesets, backwardsChangesets,
           apool: apool.toJsonable(), actualEndNum: endNum,
           timeDeltas, start: startNum, granularity };
}

/**
 * Tries to rebuild the getPadLines function of the original Etherpad
 * https://github.com/ether/pad/blob/master/etherpad/src/etherpad/control/pad/pad_changeset_control.js#L263
 */
async function getPadLines(padId, revNum)
{
  let pad = await padManager.getPad(padId);

  // get the atext
  let atext;

  if (revNum >= 0) {
    atext = await pad.getInternalRevisionAText(revNum);
  } else {
    atext = Changeset.makeAText("\n");
  }

  return {
    textlines: Changeset.splitTextLines(atext.text),
    alines: Changeset.splitAttributionLines(atext.attribs, atext.text)
  };
}

/**
 * Tries to rebuild the composePadChangeset function of the original Etherpad
 * https://github.com/ether/pad/blob/master/etherpad/src/etherpad/control/pad/pad_changeset_control.js#L241
 */
async function composePadChangesets (padId, startNum, endNum)
{
  let pad = await padManager.getPad(padId);

  // fetch all changesets we need
  let headNum = pad.getHeadRevisionNumber();
  endNum = Math.min(endNum, headNum + 1);
  startNum = Math.max(startNum, 0);

  // create an array for all changesets, we will
  // replace the values with the changeset later
  let changesetsNeeded = [];
  for (let r = startNum ; r < endNum; r++) {
    changesetsNeeded.push(r);
  }

  // get all changesets
  let changesets = {};
  await Promise.all(changesetsNeeded.map(revNum => {
    return pad.getRevisionChangeset(revNum).then(changeset => changesets[revNum] = changeset);
  }));

  // compose Changesets
  let r;
  try {
    let changeset = changesets[startNum];
    let pool = pad.apool();

    for (r = startNum + 1; r < endNum; r++) {
      let cs = changesets[r];
      changeset = Changeset.compose(changeset, cs, pool);
    }
    return changeset;

  } catch (e) {
    // r-1 indicates the rev that was build starting with startNum, applying startNum+1, +2, +3
    console.warn("failed to compose cs in pad:", padId, " startrev:", startNum," current rev:", r);
    throw e;
  }
}

function _getRoomClients(padID) {
  var roomClients = [];
  var room = socketio.sockets.adapter.rooms[padID];

  if (room) {
    for (var id in room.sockets) {
      roomClients.push(socketio.sockets.sockets[id]);
    }
  }

  return roomClients;
}

/**
 * Get the number of users in a pad
 */
exports.padUsersCount = function(padID) {
  return {
    padUsersCount: _getRoomClients(padID).length
  }
}

/**
 * Get the list of users in a pad
 */
exports.padUsers = async function(padID) {

  let padUsers = [];
  let roomClients = _getRoomClients(padID);

  // iterate over all clients (in parallel)
  await Promise.all(roomClients.map(async roomClient => {
    let s = sessioninfos[roomClient.id];
    if (s) {
      return authorManager.getAuthor(s.author).then(author => {
        author.id = s.author;
        padUsers.push(author);
      });
    }
  }));

  return { padUsers };
}

exports.sessioninfos = sessioninfos;
