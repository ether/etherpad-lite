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


var ERR = require("async-stacktrace");
var async = require("async");
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
var _ = require('underscore');

/**
 * A associative array that translates a session to a pad
 */
var session2pad = {};
/**
 * A associative array that saves which sessions belong to a pad
 */
var pad2sessions = {};

/**
 * A associative array that saves some general informations about a session
 * key = sessionId
 * values = author, rev
 *   rev = That last revision that was send to this client
 *   author = the author name of this session
 */
var sessioninfos = {};

/**
 * Saves the Socket class we need to send and recieve data from the client
 */
var socketio;

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
  //Initalize session2pad and sessioninfos for this new session
  session2pad[client.id]=null;  
  sessioninfos[client.id]={};
}

/**
 * Kicks all sessions from a pad
 * @param client the new client
 */
exports.kickSessionsFromPad = function(padID)
{
  //skip if there is nobody on this pad
  if(!pad2sessions[padID])
    return;

  //disconnect everyone from this pad
  for(var i in pad2sessions[padID])
  {
    socketio.sockets.sockets[pad2sessions[padID][i]].json.send({disconnect:"deleted"});
  }
}

/**
 * Handles the disconnection of a user
 * @param client the client that leaves
 */
exports.handleDisconnect = function(client)
{  
  //save the padname of this session
  var sessionPad=session2pad[client.id];
  
  //if this connection was already etablished with a handshake, send a disconnect message to the others
  if(sessioninfos[client.id] && sessioninfos[client.id].author)
  {
    var author = sessioninfos[client.id].author;
  
    //get the author color out of the db
    authorManager.getAuthorColorId(author, function(err, color)
    {
      ERR(err);
      
      //prepare the notification for the other users on the pad, that this user left
      var messageToTheOtherUsers = {
        "type": "COLLABROOM",
        "data": {
          type: "USER_LEAVE",
          userInfo: {
            "ip": "127.0.0.1",
            "colorId": color,
            "userAgent": "Anonymous",
            "userId": author
          }
        }
      };
      
      //Go trough all user that are still on the pad, and send them the USER_LEAVE message
      for(i in pad2sessions[sessionPad])
      {
        var socket = socketio.sockets.sockets[pad2sessions[sessionPad][i]];
        if(socket !== undefined){
          socket.json.send(messageToTheOtherUsers);
        }
        
      }
    }); 
  }
  
  //Go trough all sessions of this pad, search and destroy the entry of this client
  for(i in pad2sessions[sessionPad])
  {
    if(pad2sessions[sessionPad][i] == client.id)
    {
      pad2sessions[sessionPad].splice(i, 1); 
      break;
    }
  }
  
  //Delete the session2pad and sessioninfos entrys of this session
  delete session2pad[client.id]; 
  delete sessioninfos[client.id]; 
}

/**
 * Handles a message from a user
 * @param client the client that send this message
 * @param message the message from the client
 */
exports.handleMessage = function(client, message)
{ 
  if(message == null)
  {
    messageLogger.warn("Message is null!");
    return;
  }
  if(!message.type)
  {
    messageLogger.warn("Message has no type attribute!");
    return;
  }
  
  //Check what type of message we get and delegate to the other methodes
  if(message.type == "CLIENT_READY")
  {
    handleClientReady(client, message);
  }
  else if(message.type == "COLLABROOM" && 
          message.data.type == "USER_CHANGES")
  {
    handleUserChanges(client, message);
  }
  else if(message.type == "COLLABROOM" && 
          message.data.type == "USERINFO_UPDATE")
  {
    handleUserInfoUpdate(client, message);
  }
  else if(message.type == "COLLABROOM" && 
          message.data.type == "CHAT_MESSAGE")
  {
    handleChatMessage(client, message);
  }
  else if(message.type == "COLLABROOM" && 
          message.data.type == "SAVE_REVISION")
  {
    handleSaveRevisionMessage(client, message);
  }
  else if(message.type == "COLLABROOM" && 
          message.data.type == "CLIENT_MESSAGE" &&
          message.data.payload.type == "suggestUserName")
  {
    handleSuggestUserName(client, message);
  }
  else if(message.type == "CHANGESET_REQ")
  {
    handleChangesetRequest(client, message);
  }
  //if the message type is unknown, throw an exception
  else
  {
    messageLogger.warn("Dropped message, unknown Message Type " + message.type);
  }
}


/**
 * Handles a save revision message
 * @param client the client that send this message
 * @param message the message from the client
 */
function handleSaveRevisionMessage(client, message){
  var padId = session2pad[client.id];
  var userId = sessioninfos[client.id].author;
  
  padManager.getPad(padId, function(err, pad)
  {
    if(ERR(err)) return;
    
    pad.addSavedRevision(pad.head, userId);
  });
}

/**
 * Handles a Chat Message
 * @param client the client that send this message
 * @param message the message from the client
 */
function handleChatMessage(client, message)
{
  var time = new Date().getTime();
  var userId = sessioninfos[client.id].author;
  var text = message.data.text;
  var padId = session2pad[client.id];
  
  var pad;
  var userName;
  
  async.series([
    //get the pad
    function(callback)
    {
      padManager.getPad(padId, function(err, _pad)
      {
        if(ERR(err, callback)) return;
        pad = _pad;
        callback();
      });
    },
    function(callback)
    {
      authorManager.getAuthorName(userId, function(err, _userName)
      {
        if(ERR(err, callback)) return;
        userName = _userName;
        callback();
      });
    },
    //save the chat message and broadcast it
    function(callback)
    {
      //save the chat message
      pad.appendChatMessage(text, userId, time);
      
      var msg = {
        type: "COLLABROOM",
        data: {
                type: "CHAT_MESSAGE",
                userId: userId,
                userName: userName,
                time: time,
                text: text
              }
      };
      
      //broadcast the chat message to everyone on the pad
      for(var i in pad2sessions[padId])
      {
        socketio.sockets.sockets[pad2sessions[padId][i]].json.send(msg);
      }
      
      callback();
    }
  ], function(err)
  {
    ERR(err);
  });
}


/**
 * Handles a handleSuggestUserName, that means a user have suggest a userName for a other user
 * @param client the client that send this message
 * @param message the message from the client
 */
function handleSuggestUserName(client, message)
{
  //check if all ok
  if(message.data.payload.newName == null)
  {
    messageLogger.warn("Dropped message, suggestUserName Message has no newName!");
    return;
  }
  if(message.data.payload.unnamedId == null)
  {
    messageLogger.warn("Dropped message, suggestUserName Message has no unnamedId!");
    return;
  }
  
  var padId = session2pad[client.id];
  
  //search the author and send him this message
  for(var i in pad2sessions[padId])
  {
    if(sessioninfos[pad2sessions[padId][i]].author == message.data.payload.unnamedId)
    {
      socketio.sockets.sockets[pad2sessions[padId][i]].send(message);
      break;
    }
  }
}

/**
 * Handles a USERINFO_UPDATE, that means that a user have changed his color or name. Anyway, we get both informations
 * @param client the client that send this message
 * @param message the message from the client
 */
function handleUserInfoUpdate(client, message)
{
  //check if all ok
  if(message.data.userInfo.colorId == null)
  {
    messageLogger.warn("Dropped message, USERINFO_UPDATE Message has no colorId!");
    return;
  }
  
  //Find out the author name of this session
  var author = sessioninfos[client.id].author;
  
  //Tell the authorManager about the new attributes
  authorManager.setAuthorColorId(author, message.data.userInfo.colorId);
  authorManager.setAuthorName(author, message.data.userInfo.name);
  
  var padId = session2pad[client.id];
  
  //set a null name, when there is no name set. cause the client wants it null
  if(message.data.userInfo.name == null)
  {
    message.data.userInfo.name = null;
  }
  
  //The Client don't know about a USERINFO_UPDATE, it can handle only new user_newinfo, so change the message type
  message.data.type = "USER_NEWINFO";
  
  //Send the other clients on the pad the update message
  for(var i in pad2sessions[padId])
  {
    if(pad2sessions[padId][i] != client.id)
    {
      socketio.sockets.sockets[pad2sessions[padId][i]].json.send(message);
    }
  }
}

/**
 * Handles a USERINFO_UPDATE, that means that a user have changed his color or name. Anyway, we get both informations
 * This Method is nearly 90% copied out of the Etherpad Source Code. So I can't tell you what happens here exactly
 * Look at https://github.com/ether/pad/blob/master/etherpad/src/etherpad/collab/collab_server.js in the function applyUserChanges()
 * @param client the client that send this message
 * @param message the message from the client
 */
function handleUserChanges(client, message)
{
  //check if all ok
  if(message.data.baseRev == null)
  {
    messageLogger.warn("Dropped message, USER_CHANGES Message has no baseRev!");
    return;
  }
  if(message.data.apool == null)
  {
    messageLogger.warn("Dropped message, USER_CHANGES Message has no apool!");
    return;
  }
  if(message.data.changeset == null)
  {
    messageLogger.warn("Dropped message, USER_CHANGES Message has no changeset!");
    return;
  }
  
  //get all Vars we need
  var baseRev = message.data.baseRev;
  var wireApool = (new AttributePool()).fromJsonable(message.data.apool);
  var changeset = message.data.changeset;
      
  var r, apool, pad;
    
  async.series([
    //get the pad
    function(callback)
    {
      padManager.getPad(session2pad[client.id], function(err, value)
      {
        if(ERR(err, callback)) return;
        pad = value;
        callback();
      });
    },
    //create the changeset
    function(callback)
    {
      //ex. _checkChangesetAndPool
  
      //Copied from Etherpad, don't know what it does exactly
      try
      {
        //this looks like a changeset check, it throws errors sometimes
        Changeset.checkRep(changeset);
      
        Changeset.eachAttribNumber(changeset, function(n) {
          if (! wireApool.getAttrib(n)) {
            throw "Attribute pool is missing attribute "+n+" for changeset "+changeset;
          }
        });
      }
      //there is an error in this changeset, so just refuse it
      catch(e)
      {
        console.warn("Can't apply USER_CHANGES "+changeset+", cause it faild checkRep");
        client.json.send({disconnect:"badChangeset"});
        return;
      }
        
      //ex. adoptChangesetAttribs
        
      //Afaik, it copies the new attributes from the changeset, to the global Attribute Pool
      changeset = Changeset.moveOpsToNewPool(changeset, wireApool, pad.pool);
        
      //ex. applyUserChanges
      apool = pad.pool;
      r = baseRev;
        
      //https://github.com/caolan/async#whilst
      async.whilst(
        function() { return r < pad.getHeadRevisionNumber(); },
        function(callback)
        {
          r++;
            
          pad.getRevisionChangeset(r, function(err, c)
          {
            if(ERR(err, callback)) return;
            
            changeset = Changeset.follow(c, changeset, false, apool);
            callback(null);
          });
        },
        //use the callback of the series function
        callback
      );
    },
    //do correction changesets, and send it to all users
    function (callback)
    {
      var prevText = pad.text();
      
      if (Changeset.oldLen(changeset) != prevText.length) 
      {
        console.warn("Can't apply USER_CHANGES "+changeset+" with oldLen " + Changeset.oldLen(changeset) + " to document of length " + prevText.length);
        client.json.send({disconnect:"badChangeset"});
        callback();
        return;
      }
        
      var thisAuthor = sessioninfos[client.id].author;
        
      pad.appendRevision(changeset, thisAuthor);
        
      var correctionChangeset = _correctMarkersInPad(pad.atext, pad.pool);
      if (correctionChangeset) {
        pad.appendRevision(correctionChangeset);
      }
        
      if (pad.text().lastIndexOf("\n\n") != pad.text().length-2) {
        var nlChangeset = Changeset.makeSplice(pad.text(), pad.text().length-1, 0, "\n");
        pad.appendRevision(nlChangeset);
      }
        
      exports.updatePadClients(pad, callback);
    }
  ], function(err)
  {
    ERR(err);
  });
}

exports.updatePadClients = function(pad, callback)
{       
  //skip this step if noone is on this pad
  if(!pad2sessions[pad.id])
  {
    callback();
    return;
  }
  
  //go trough all sessions on this pad
  async.forEach(pad2sessions[pad.id], function(session, callback)
  {

    //https://github.com/caolan/async#whilst
    //send them all new changesets
    async.whilst(
      function (){ return sessioninfos[session].rev < pad.getHeadRevisionNumber()},
      function(callback)
      {      
        var author, revChangeset, currentTime;
        var r = sessioninfos[session].rev + 1;
      
        async.parallel([
          function (callback)
          {
            pad.getRevisionAuthor(r, function(err, value)
            {
              if(ERR(err, callback)) return;
              author = value;
              callback();
            });
          },
          function (callback)
          {
            pad.getRevisionChangeset(r, function(err, value)
            {
              if(ERR(err, callback)) return;
              revChangeset = value;
              callback();
            });
          },
          function (callback)
          {
            pad.getRevisionDate(r, function(err, date)
            {
              if(ERR(err, callback)) return;
              currentTime = date;
              callback();
            });
          }
        ], function(err)
        {
          if(ERR(err, callback)) return;
          // next if session has not been deleted
          if(sessioninfos[session] == null)
          {
            callback(null);
            return;
          }
          if(author == sessioninfos[session].author)
          {
            socketio.sockets.sockets[session].json.send({"type":"COLLABROOM","data":{type:"ACCEPT_COMMIT", newRev:r}});
          }
          else
          {
            var forWire = Changeset.prepareForWire(revChangeset, pad.pool);
            var wireMsg = {"type":"COLLABROOM",
                           "data":{type:"NEW_CHANGES",
                                   newRev:r,
                                   changeset: forWire.translated,
                                   apool: forWire.pool,
                                   author: author,
                                   currentTime: currentTime,
                                   timeDelta: currentTime - sessioninfos[session].time
                                  }};        
                         
            socketio.sockets.sockets[session].json.send(wireMsg);
          }

           if(sessioninfos[session] != null)
           {
             sessioninfos[session].time = currentTime;
             sessioninfos[session].rev = r;
           }
          
          callback(null);
        });
      },
      callback
    );
  },callback);  
}

/**
 * Copied from the Etherpad Source Code. Don't know what this methode does excatly...
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
    
    var hasMarker = _.find(AttributeManager.lineAttributes, function(attribute){
      return Changeset.opAttributeValue(op, attribute, apool);
    }) !== undefined;
    
    if (hasMarker) {
      for(var i=0;i<op.chars;i++) {
        if (offset > 0 && text.charAt(offset-1) != '\n') {
          badMarkers.push(offset);
        }
        offset++;
      }
    }
    else {
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

/**
 * Handles a CLIENT_READY. A CLIENT_READY is the first message from the client to the server. The Client sends his token 
 * and the pad it wants to enter. The Server answers with the inital values (clientVars) of the pad
 * @param client the client that send this message
 * @param message the message from the client
 */
function handleClientReady(client, message)
{
  //check if all ok
  if(!message.token)
  {
    messageLogger.warn("Dropped message, CLIENT_READY Message has no token!");
    return;
  }
  if(!message.padId)
  {
    messageLogger.warn("Dropped message, CLIENT_READY Message has no padId!");
    return;
  }
  if(!message.protocolVersion)
  {
    messageLogger.warn("Dropped message, CLIENT_READY Message has no protocolVersion!");
    return;
  }
  if(message.protocolVersion != 2)
  {
    messageLogger.warn("Dropped message, CLIENT_READY Message has a unknown protocolVersion '" + message.protocolVersion + "'!");
    return;
  }

  var author;
  var authorName;
  var authorColorId;
  var pad;
  var historicalAuthorData = {};
  var currentTime;
  var readOnlyId;
  var chatMessages;

  async.series([
    //check permissions
    function(callback)
    {
      securityManager.checkAccess (message.padId, message.sessionID, message.token, message.password, function(err, statusObject)
      {
        if(ERR(err, callback)) return;
        
        //access was granted
        if(statusObject.accessStatus == "grant")
        {
          author = statusObject.authorID;
          callback();
        }
        //no access, send the client a message that tell him why
        else
        {
          client.json.send({accessStatus: statusObject.accessStatus})
        }
      });
    }, 
    //get all authordata of this new user
    function(callback)
    {
      async.parallel([
        //get colorId
        function(callback)
        {
          authorManager.getAuthorColorId(author, function(err, value)
          {
            if(ERR(err, callback)) return;
            authorColorId = value;
            callback();
          });
        },
        //get author name
        function(callback)
        {
          authorManager.getAuthorName(author, function(err, value)
          {
            if(ERR(err, callback)) return;
            authorName = value;
            callback();
          });
        },
        function(callback)
        {
          padManager.getPad(message.padId, function(err, value)
          {
            if(ERR(err, callback)) return;
            pad = value;
            callback();
          });
        },
        function(callback)
        {
          readOnlyManager.getReadOnlyId(message.padId, function(err, value)
          {
            if(ERR(err, callback)) return;
            readOnlyId = value;
            callback();
          });
        }
      ], callback);
    },
    //these db requests all need the pad object
    function(callback)
    {
      var authors = pad.getAllAuthors();
      
      async.parallel([
        //get timestamp of latest revission needed for timeslider
        function(callback)
        {
          pad.getRevisionDate(pad.getHeadRevisionNumber(), function(err, date)
          {
            if(ERR(err, callback)) return;
            currentTime = date;
            callback();
          });
        },
        //get all author data out of the database
        function(callback)
        {
          async.forEach(authors, function(authorId, callback)
          {
            authorManager.getAuthor(authorId, function(err, author)
            {
              if(ERR(err, callback)) return;
              delete author.timestamp;
              historicalAuthorData[authorId] = author;
              callback();
            });
          }, callback);
        },
        //get the latest chat messages
        function(callback)
        {
          pad.getLastChatMessages(100, function(err, _chatMessages)
          {
            if(ERR(err, callback)) return;
            chatMessages = _chatMessages;
            callback();
          });
        }
      ], callback);
      
    },
    function(callback)
    {
      //Check if this author is already on the pad, if yes, kick the other sessions!
      if(pad2sessions[message.padId])
      {
        for(var i in pad2sessions[message.padId])
        {
          if(sessioninfos[pad2sessions[message.padId][i]] && sessioninfos[pad2sessions[message.padId][i]].author == author)
          {
            var socket = socketio.sockets.sockets[pad2sessions[message.padId][i]];
            if(socket) socket.json.send({disconnect:"userdup"});
          }
        }
      }
      
      //Save in session2pad that this session belonges to this pad
      var sessionId=String(client.id);
      session2pad[sessionId] = message.padId;
      
      //check if there is already a pad2sessions entry, if not, create one
      if(!pad2sessions[message.padId])
      {
        pad2sessions[message.padId] = [];
      }
      
      //Saves in pad2sessions that this session belongs to this pad
      pad2sessions[message.padId].push(sessionId);
      
      //prepare all values for the wire
      var atext = Changeset.cloneAText(pad.atext);
      var attribsForWire = Changeset.prepareForWire(atext.attribs, pad.pool);
      var apool = attribsForWire.pool.toJsonable();
      atext.attribs = attribsForWire.translated;
      
      var clientVars = {
        "accountPrivs": {
            "maxRevisions": 100
        },
        "initialRevisionList": [],
        "initialOptions": {
            "guestPolicy": "deny"
        },
        "savedRevisions": pad.getSavedRevisions(),
        "collab_client_vars": {
            "initialAttributedText": atext,
            "clientIp": "127.0.0.1",
            //"clientAgent": "Anonymous Agent",
            "padId": message.padId,
            "historicalAuthorData": historicalAuthorData,
            "apool": apool,
            "rev": pad.getHeadRevisionNumber(),
            "globalPadId": message.padId,
            "time": currentTime,
        },
        "colorPalette": ["#ffc7c7", "#fff1c7", "#e3ffc7", "#c7ffd5", "#c7ffff", "#c7d5ff", "#e3c7ff", "#ffc7f1", "#ff8f8f", "#ffe38f", "#c7ff8f", "#8fffab", "#8fffff", "#8fabff", "#c78fff", "#ff8fe3", "#d97979", "#d9c179", "#a9d979", "#79d991", "#79d9d9", "#7991d9", "#a979d9", "#d979c1", "#d9a9a9", "#d9cda9", "#c1d9a9", "#a9d9b5", "#a9d9d9", "#a9b5d9", "#c1a9d9", "#d9a9cd", "#4c9c82", "#12d1ad", "#2d8e80", "#7485c3", "#a091c7", "#3185ab", "#6818b4", "#e6e76d", "#a42c64", "#f386e5", "#4ecc0c", "#c0c236", "#693224", "#b5de6a", "#9b88fd", "#358f9b", "#496d2f", "#e267fe", "#d23056", "#1a1a64", "#5aa335", "#d722bb", "#86dc6c", "#b5a714", "#955b6a", "#9f2985", "#4b81c8", "#3d6a5b", "#434e16", "#d16084", "#af6a0e", "#8c8bd8"],
        "clientIp": "127.0.0.1",
        "userIsGuest": true,
        "userColor": authorColorId,
        "padId": message.padId,
        "initialTitle": "Pad: " + message.padId,
        "opts": {},
        "chatHistory": chatMessages,
        "numConnectedUsers": pad2sessions[message.padId].length,
        "isProPad": false,
        "readOnlyId": readOnlyId,
        "serverTimestamp": new Date().getTime(),
        "globalPadId": message.padId,
        "userId": author,
        "cookiePrefsToSet": {
            "fullWidth": false,
            "hideSidebar": false
        },
        "abiwordAvailable": settings.abiwordAvailable(), 
        "plugins": {
	  "plugins": plugins.plugins,
	  "parts": plugins.parts,
	},
          "initialChangesets": [] // FIXME: REMOVE THIS SHIT

      }

      //Add a username to the clientVars if one avaiable
      if(authorName != null)
      {
        clientVars.userName = authorName;
      }
      
      if(sessioninfos[client.id] !== undefined)
      {
        //This is a reconnect, so we don't have to send the client the ClientVars again
        if(message.reconnect == true)
        {
          //Save the revision in sessioninfos, we take the revision from the info the client send to us
          sessioninfos[client.id].rev = message.client_rev;
        }
        //This is a normal first connect
        else
        {
          //Send the clientVars to the Client
          client.json.send({type: "CLIENT_VARS", data: clientVars});
          //Save the revision in sessioninfos
          sessioninfos[client.id].rev = pad.getHeadRevisionNumber();
        }
        
        //Save the revision and the author id in sessioninfos
        sessioninfos[client.id].author = author;
      }
      
      //prepare the notification for the other users on the pad, that this user joined
      var messageToTheOtherUsers = {
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
      
      //Add the authorname of this new User, if avaiable
      if(authorName != null)
      {
        messageToTheOtherUsers.data.userInfo.name = authorName;
      }
      
      //Run trough all sessions of this pad
      async.forEach(pad2sessions[message.padId], function(sessionID, callback)
      {
        var author, socket, sessionAuthorName, sessionAuthorColorId;
        
        //Since sessioninfos might change while being enumerated, check if the 
        //sessionID is still assigned to a valid session
        if(sessioninfos[sessionID] !== undefined &&
          socketio.sockets.sockets[sessionID] !== undefined){
          author = sessioninfos[sessionID].author;
          socket = socketio.sockets.sockets[sessionID];
        }else {
          // If the sessionID is not valid, callback();
          callback();
          return;
        }
        async.series([
          //get the authorname & colorId
          function(callback)
          {
            async.parallel([
              function(callback)
              {
                authorManager.getAuthorColorId(author, function(err, value)
                {
                  if(ERR(err, callback)) return;
                  sessionAuthorColorId = value;
                  callback();
                })
              },
              function(callback)
              {
                authorManager.getAuthorName(author, function(err, value)
                {
                  if(ERR(err, callback)) return;
                  sessionAuthorName = value;
                  callback();
                })
              }
            ],callback);
          }, 
          function (callback)
          {
            //Jump over, if this session is the connection session
            if(sessionID != client.id)
            {
              //Send this Session the Notification about the new user
              socket.json.send(messageToTheOtherUsers);
            
              //Send the new User a Notification about this other user
              var messageToNotifyTheClientAboutTheOthers = {
                "type": "COLLABROOM",
                "data": {
                  type: "USER_NEWINFO",
                  userInfo: {
                    "ip": "127.0.0.1",
                    "colorId": sessionAuthorColorId,
                    "name": sessionAuthorName,
                    "userAgent": "Anonymous",
                    "userId": author
                  }
                }
              };
              client.json.send(messageToNotifyTheClientAboutTheOthers);
            }
          }
        ], callback);        
      }, callback);
    }
  ],function(err)
  {
    ERR(err);
  });
}

/**
 * Handles a request for a rough changeset, the timeslider client needs it 
 */
function handleChangesetRequest(client, message)
{
  //check if all ok
  if(message.data == null)
  {
    messageLogger.warn("Dropped message, changeset request has no data!");
    return;
  }
  if(message.padId == null)
  {
    messageLogger.warn("Dropped message, changeset request has no padId!");
    return;
  }
  if(message.data.granularity == null)
  {
    messageLogger.warn("Dropped message, changeset request has no granularity!");
    return;
  }
  if(message.data.start == null)
  {
    messageLogger.warn("Dropped message, changeset request has no start!");
    return;
  }
  if(message.data.requestID == null)
  {
    messageLogger.warn("Dropped message, changeset request has no requestID!");
    return;
  }
  
  var granularity = message.data.granularity;
  var start = message.data.start;
  var end = start + (100 * granularity);
  var padId = message.padId;
  
  //build the requested rough changesets and send them back
  getChangesetInfo(padId, start, end, granularity, function(err, changesetInfo)
  {
    ERR(err);
    
    var data = changesetInfo;
    data.requestID = message.data.requestID;
    
    client.json.send({type: "CHANGESET_REQ", data: data});
  });
}


/**
 * Tries to rebuild the getChangestInfo function of the original Etherpad
 * https://github.com/ether/pad/blob/master/etherpad/src/etherpad/control/pad/pad_changeset_control.js#L144
 */
function getChangesetInfo(padId, startNum, endNum, granularity, callback)
{
  var forwardsChangesets = [];
  var backwardsChangesets = [];
  var timeDeltas = [];
  var apool = new AttributePool();
  var pad;
  var composedChangesets = {};
  var revisionDate = [];
  var lines;
  
  async.series([
    //get the pad from the database
    function(callback)
    {
      padManager.getPad(padId, function(err, _pad)
      {        
        if(ERR(err, callback)) return;
        pad = _pad;
        callback();
      });
    },
    function(callback)
    {      
      //calculate the last full endnum
      var lastRev = pad.getHeadRevisionNumber();
      if (endNum > lastRev+1) {
        endNum = lastRev+1;
      }
      endNum = Math.floor(endNum / granularity)*granularity;
      
      var compositesChangesetNeeded = [];
      var revTimesNeeded = [];
      
      //figure out which composite Changeset and revTimes we need, to load them in bulk
      var compositeStart = startNum;
      while (compositeStart < endNum) 
      {
        var compositeEnd = compositeStart + granularity;
        
        //add the composite Changeset we needed
        compositesChangesetNeeded.push({start: compositeStart, end: compositeEnd});
        
        //add the t1 time we need
        revTimesNeeded.push(compositeStart == 0 ? 0 : compositeStart - 1);
        //add the t2 time we need
        revTimesNeeded.push(compositeEnd - 1);
        
        compositeStart += granularity;
      }
      
      //get all needed db values parallel
      async.parallel([
        function(callback)
        {
          //get all needed composite Changesets
          async.forEach(compositesChangesetNeeded, function(item, callback)
          {
            composePadChangesets(padId, item.start, item.end, function(err, changeset)
            {
              if(ERR(err, callback)) return;
              composedChangesets[item.start + "/" + item.end] = changeset;
              callback();
            });
          }, callback);
        },
        function(callback)
        {
          //get all needed revision Dates
          async.forEach(revTimesNeeded, function(revNum, callback)
          {
            pad.getRevisionDate(revNum, function(err, revDate)
            {
              if(ERR(err, callback)) return;
              revisionDate[revNum] = Math.floor(revDate/1000);
              callback();
            });
          }, callback);
        },
        //get the lines
        function(callback)
        {
          getPadLines(padId, startNum-1, function(err, _lines)
          {
            if(ERR(err, callback)) return;
            lines = _lines;
            callback();
          }); 
        }
      ], callback);
    },
    //doesn't know what happens here excatly :/
    function(callback)
    {    
      var compositeStart = startNum;
      
      while (compositeStart < endNum) 
      {
        if (compositeStart + granularity > endNum) 
        {
          break;
        }
        
        var compositeEnd = compositeStart + granularity;
      
        var forwards = composedChangesets[compositeStart + "/" + compositeEnd];
        var backwards = Changeset.inverse(forwards, lines.textlines, lines.alines, pad.apool());
        
        Changeset.mutateAttributionLines(forwards, lines.alines, pad.apool());
        Changeset.mutateTextLines(forwards, lines.textlines);
      
        var forwards2 = Changeset.moveOpsToNewPool(forwards, pad.apool(), apool);
        var backwards2 = Changeset.moveOpsToNewPool(backwards, pad.apool(), apool);
        
        var t1, t2;
        if (compositeStart == 0) 
        {
          t1 = revisionDate[0];
        }
        else 
        {
          t1 = revisionDate[compositeStart - 1];
        }
        
        t2 = revisionDate[compositeEnd - 1];
        
        timeDeltas.push(t2 - t1);
        forwardsChangesets.push(forwards2);
        backwardsChangesets.push(backwards2);
        
        compositeStart += granularity;
      }
      
      callback();
    }
  ], function(err)
  {
    if(ERR(err, callback)) return;
    
    callback(null, {forwardsChangesets: forwardsChangesets,
                    backwardsChangesets: backwardsChangesets,
                    apool: apool.toJsonable(),
                    actualEndNum: endNum,
                    timeDeltas: timeDeltas,
                    start: startNum,
                    granularity: granularity });
  });
}

/**
 * Tries to rebuild the getPadLines function of the original Etherpad
 * https://github.com/ether/pad/blob/master/etherpad/src/etherpad/control/pad/pad_changeset_control.js#L263
 */
function getPadLines(padId, revNum, callback) 
{
  var atext;
  var result = {};
  var pad;

  async.series([
    //get the pad from the database
    function(callback)
    {
      padManager.getPad(padId, function(err, _pad)
      {        
        if(ERR(err, callback)) return;
        pad = _pad;
        callback();
      });
    },
    //get the atext
    function(callback)
    {
      if(revNum >= 0)
      {
        pad.getInternalRevisionAText(revNum, function(err, _atext)
        {
          if(ERR(err, callback)) return;
          atext = _atext;
          callback();
        });
      }
      else
      {
        atext = Changeset.makeAText("\n");
        callback(null);
      }
    },
    function(callback)
    {
      result.textlines = Changeset.splitTextLines(atext.text);
      result.alines = Changeset.splitAttributionLines(atext.attribs, atext.text);
      callback(null);
    }
  ], function(err)
  {
    if(ERR(err, callback)) return;
    callback(null, result);
  });
}

/**
 * Tries to rebuild the composePadChangeset function of the original Etherpad
 * https://github.com/ether/pad/blob/master/etherpad/src/etherpad/control/pad/pad_changeset_control.js#L241
 */
function composePadChangesets(padId, startNum, endNum, callback)
{
  var pad;
  var changesets = [];
  var changeset;

  async.series([
    //get the pad from the database
    function(callback)
    {
      padManager.getPad(padId, function(err, _pad)
      {        
        if(ERR(err, callback)) return;
        pad = _pad;
        callback();
      });
    },
    //fetch all changesets we need
    function(callback)
    {
      var changesetsNeeded=[];
      
      //create a array for all changesets, we will 
      //replace the values with the changeset later
      for(var r=startNum;r<endNum;r++)
      {
        changesetsNeeded.push(r);
      }
      
      //get all changesets
      async.forEach(changesetsNeeded, function(revNum,callback)
      {
        pad.getRevisionChangeset(revNum, function(err, value)
        {
          if(ERR(err, callback)) return;
          changesets[revNum] = value;
          callback();
        });
      },callback);
    },
    //compose Changesets
    function(callback)
    {
      changeset = changesets[startNum];
      var pool = pad.apool();
      
      for(var r=startNum+1;r<endNum;r++)
      {
        var cs = changesets[r];
        changeset = Changeset.compose(changeset, cs, pool);
      }
      
      callback(null);
    }
  ],
  //return err and changeset
  function(err)
  {
    if(ERR(err, callback)) return;
    callback(null, changeset);
  });
}
