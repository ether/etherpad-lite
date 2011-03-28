/**
 * Copyright 2009 Google Inc., 2011 Peter 'Pita' Martischka
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

var padManager = require("./PadManager");
var Changeset = require("./Changeset");
var AttributePoolFactory = require("./AttributePoolFactory");
var authorManager = require("./AuthorManager");

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
  //check if all ok
  throwExceptionIfClientOrIOisInvalid(client);
  
  //Initalize session2pad and sessioninfos for this new session
  session2pad[client.sessionId]=null;  
  sessioninfos[client.sessionId]={};
}

/**
 * Handles the disconnection of a user
 * @param client the client that leaves
 */
exports.handleDisconnect = function(client)
{
  //check if all ok
  throwExceptionIfClientOrIOisInvalid(client);
  
  //save the padname of this session
  var sessionPad=session2pad[client.sessionId];
  
  //Go trough all sessions of this pad, search and destroy the entry of this client
  for(i in pad2sessions[sessionPad])
  {
    if(pad2sessions[sessionPad][i] == client.sessionId)
    {
      delete pad2sessions[sessionPad][i];  
      break;
    }
  }
  
  //Delete the session2pad and sessioninfos entrys of this session
  delete session2pad[client.sessionId]; 
  delete sessioninfos[client.sessionId]; 
}

/**
 * Handles a message from a user
 * @param client the client that send this message
 * @param message the message from the client
 */
exports.handleMessage = function(client, message)
{ 
  //check if all ok
  throwExceptionIfClientOrIOisInvalid(client);
  
  if(message == null)
  {
    throw "Message is null!";
  }
  //Etherpad sometimes send JSON and sometimes a JSONstring...
  if(typeof message == "string")
  {
    message = JSON.parse(message);
  }
  if(!message.type)
  {
    throw "Message have no type attribute!";
  }
  
  //Check what type of message we get and delegate to the other methodes
  if(message.type == "CLIENT_READY")
  {
    handleClientReady(client, message);
  }
  else if(message.type == "COLLABROOM" && 
          message.data.type == "USER_CHANGES")
  {
    console.error(JSON.stringify(message));
    handleUserChanges(client, message);
  }
  else if(message.type == "COLLABROOM" && 
          message.data.type == "USERINFO_UPDATE")
  {
    console.error(JSON.stringify(message));
    handleUserInfoUpdate(client, message);
  }
  //if the message type is unkown, throw an exception
  else
  {
    console.error(message);
    throw "unkown Message Type: '" + message.type + "'";
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
    throw "USERINFO_UPDATE Message have no colorId!";
  }
  
  //Find out the author name of this session
  var author = sessioninfos[client.sessionId].author;
  
  //Tell the authorManager about the new attributes
  authorManager.setAuthorColorId(author, message.data.userInfo.colorId);
  authorManager.setAuthorName(author, message.data.userInfo.name);
  
  var padId = session2pad[client.sessionId];
  
  //set a null name, when there is no name set. cause the client wants it null
  if(message.data.userInfo.name == null)
  {
    message.data.userInfo.name = null;
  }
  
  //The Client don't know about a USERINFO_UPDATE, it can handle only new user_newinfo, so change the message type
  message.data.type = "USER_NEWINFO";
  
  //Send the other clients on the pad the update message
  for(i in pad2sessions[padId])
  {
    if(pad2sessions[padId][i] != client.sessionId)
    {
      socketio.clients[pad2sessions[padId][i]].send(message);
    }
  }
}

function errlog(name, value)
{
  console.error(name+"=" + JSON.stringify(value));
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
    throw "USER_CHANGES Message have no baseRev!";
  }
  if(message.data.apool == null)
  {
    throw "USER_CHANGES Message have no apool!";
  }
  if(message.data.changeset == null)
  {
    throw "USER_CHANGES Message have no changeset!";
  }
  
  //get all Vars we need
  var baseRev = message.data.baseRev;
  var wireApool = (AttributePoolFactory.createAttributePool()).fromJsonable(message.data.apool);
  var changeset = message.data.changeset;
  var pad = padManager.getPad(session2pad[client.sessionId], false);
  
  //ex. _checkChangesetAndPool
  
  //Copied from Etherpad, don't know what it does exactly
  Changeset.checkRep(changeset);
  Changeset.eachAttribNumber(changeset, function(n) {
    if (! wireApool.getAttrib(n)) {
      throw "Attribute pool is missing attribute "+n+" for changeset "+changeset;
    }
  });
  
  //ex. adoptChangesetAttribs
  
  //Afaik, it copies the new attributes from the changeset, to the global Attribute Pool
  changeset = Changeset.moveOpsToNewPool(changeset, wireApool, pad.pool());
  
  //ex. applyUserChanges
  
  var apool = pad.pool();
  var r = baseRev;
  
  while (r < pad.getHeadRevisionNumber()) {
    r++;
    var c = pad.getRevisionChangeset(r);
    changeset = Changeset.follow(c, changeset, false, apool);
  }
  
  var prevText = pad.text();
  if (Changeset.oldLen(changeset) != prevText.length) {
    throw "Can't apply USER_CHANGES "+changeset+" with oldLen " 
    + Changeset.oldLen(changeset) + " to document of length " + prevText.length;
  }
  
  var thisAuthor = sessioninfos[client.sessionId].author;
  
  pad.appendRevision(changeset, thisAuthor);
  
  var correctionChangeset = _correctMarkersInPad(pad.atext(), pad.pool());
  if (correctionChangeset) {
    pad.appendRevision(correctionChangeset);
  }
  
  if (pad.text().lastIndexOf("\n\n") != pad.text().length-2) {
    var nlChangeset = Changeset.makeSplice(
      pad.text(), pad.text().length-1, 0, "\n");
    pad.appendRevision(nlChangeset);
  }
  
  //ex. updatePadClients
  
  for(i in pad2sessions[pad.id])
  {
    var session = pad2sessions[pad.id][i];
    var lastRev = sessioninfos[session].rev;
    
    while (lastRev < pad.getHeadRevisionNumber()) 
    {
      var r = ++lastRev;
      var author = pad.getRevisionAuthor(r);
      
      if(author == sessioninfos[session].author)
      {
        socketio.clients[session].send({"type":"COLLABROOM","data":{type:"ACCEPT_COMMIT", newRev:r}});
      }
      else
      {
        var forWire = Changeset.prepareForWire(pad.getRevisionChangeset(r), pad.pool());
        var wireMsg = {"type":"COLLABROOM","data":{type:"NEW_CHANGES", newRev:r,
                   changeset: forWire.translated,
                   apool: forWire.pool,
                   author: author}};        
                   
        socketio.clients[session].send(wireMsg);
      }
    }
    
    sessioninfos[session].rev = pad.getHeadRevisionNumber();
  }
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
    var listValue = Changeset.opAttributeValue(op, 'list', apool);
    if (listValue) {
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
    throw "CLIENT_READY Message have no token!";
  }
  if(!message.padId)
  {
    throw "CLIENT_READY Message have no padId!";
  }
  if(!message.protocolVersion)
  {
    throw "CLIENT_READY Message have no protocolVersion!";
  }
  if(message.protocolVersion != 1)
  {
    throw "CLIENT_READY Message have a unkown protocolVersion '" + protocolVersion + "'!";
  }

  //Ask the author Manager for a authorname of this token. 
  var author = authorManager.getAuthor4Token(message.token);
  
  //Check if this author is already on the pad, if yes, kick him!
  if(pad2sessions[message.padId])
  {
    for(var i in pad2sessions[message.padId])
    {
      if(sessioninfos[pad2sessions[message.padId][i]].author == author)
      {
        client.send({disconnect:"doublelogin"});
        return;
      }
    }
  }
  
  //Save in session2pad that this session belonges to this pad
  var sessionId=String(client.sessionId);
  session2pad[sessionId] = message.padId;
  
  //check if there is already a pad2sessions entry, if not, create one
  if(!pad2sessions[message.padId])
  {
    pad2sessions[message.padId] = [];
  }
  
  //Saves in pad2sessions that this session belongs to this pad
  pad2sessions[message.padId].push(sessionId);
   
  //Tell the PadManager that it should ensure that this Pad exist
  padManager.ensurePadExists(message.padId);
  
  //Ask the PadManager for a function Wrapper for this Pad
  var pad = padManager.getPad(message.padId, false);
  
  //prepare all values for the wire
  atext = pad.atext();
  var attribsForWire = Changeset.prepareForWire(atext.attribs, pad.pool());
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
    "collab_client_vars": {
        "initialAttributedText": atext,
        "clientIp": client.request.connection.remoteAddress,
        //"clientAgent": "Anonymous Agent",
        "padId": message.padId,
        "historicalAuthorData": {},
        "apool": apool,
        "rev": pad.getHeadRevisionNumber(),
        "globalPadId": message.padId
    },
    "colorPalette": ["#ffc7c7", "#fff1c7", "#e3ffc7", "#c7ffd5", "#c7ffff", "#c7d5ff", "#e3c7ff", "#ffc7f1", "#ff8f8f", "#ffe38f", "#c7ff8f", "#8fffab", "#8fffff", "#8fabff", "#c78fff", "#ff8fe3", "#d97979", "#d9c179", "#a9d979", "#79d991", "#79d9d9", "#7991d9", "#a979d9", "#d979c1", "#d9a9a9", "#d9cda9", "#c1d9a9", "#a9d9b5", "#a9d9d9", "#a9b5d9", "#c1a9d9", "#d9a9cd"],
    "clientIp": client.request.connection.remoteAddress,
    "userIsGuest": true,
    "userColor": authorManager.getAuthorColorId(author),
    "padId": message.padId,
    "initialTitle": "Pad: " + message.padId,
    "opts": {},
    "chatHistory": {
        "start": 0,
        "historicalAuthorData": {},
        "end": 0,
        "lines": []
    },
    "numConnectedUsers": pad2sessions[message.padId].length,
    "isProPad": false,
    "serverTimestamp": new Date().getTime(),
    "globalPadId": message.padId,
    "userId": author,
    "cookiePrefsToSet": {
        "fullWidth": false,
        "hideSidebar": false
    },
    "hooks": {}
  }
  
  //Add a username to the clientVars if one avaiable
  if(authorManager.getAuthorName(author) != null)
  {
    clientVars.userName = authorManager.getAuthorName(author);
  }
  
  //Add all authors that worked on this pad, to the historicalAuthorData on clientVars
  var allAuthors = pad.getAllAuthors();
  for(i in allAuthors)
  {
    clientVars.collab_client_vars.historicalAuthorData[allAuthors[i]] = {};
    if(authorManager.getAuthorName(author) != null)
      clientVars.collab_client_vars.historicalAuthorData[allAuthors[i]].name = authorManager.getAuthorName(author);
    clientVars.collab_client_vars.historicalAuthorData[allAuthors[i]].colorId = authorManager.getAuthorColorId(author);
  }
  
  //Send the clientVars to the Client
  client.send(clientVars);
  
  //Save the revision and the author id in sessioninfos
  sessioninfos[client.sessionId].rev = pad.getHeadRevisionNumber();
  sessioninfos[client.sessionId].author = author;
  
  //prepare the notification for the other users on the pad, that this user joined
  var messageToTheOtherUsers = {
    "type": "COLLABROOM",
    "data": {
      type: "USER_NEWINFO",
      userInfo: {
        "ip": "127.0.0.1",
        "colorId": authorManager.getAuthorColorId(author),
        "userAgent": "Anonymous",
        "userId": author
      }
    }
  };
  
  //Add the authorname of this new User, if avaiable
  if(authorManager.getAuthorName(author) != null)
  {
    messageToTheOtherUsers.data.userInfo.name = authorManager.getAuthorName(author);
  }
  
  //Run trough all sessions of this pad
  for(i in pad2sessions[message.padId])
  {
    //Jump over, if this session is the connection session
    if(pad2sessions[message.padId][i] != client.sessionId)
    {
      //Send this Session the Notification about the new user
      socketio.clients[pad2sessions[message.padId][i]].send(messageToTheOtherUsers);
    
      //Send the new User a Notification about this other user
      var messageToNotifyTheClientAboutTheOthers = {
        "type": "COLLABROOM",
        "data": {
          type: "USER_NEWINFO",
          userInfo: {
            "ip": "127.0.0.1",
            "colorId": authorManager.getAuthorColorId(sessioninfos[pad2sessions[message.padId][i]].author),
            "userAgent": "Anonymous",
            "userId": sessioninfos[pad2sessions[message.padId][i]].author
          }
        }
      };
      client.send(messageToNotifyTheClientAboutTheOthers);
    }
  }
  
  
}

/**
 * A internal function that simply checks if client or socketio is null and throws a exception if yes
 */
function throwExceptionIfClientOrIOisInvalid(client)
{
  if(client == null)
  {
    throw "Client is null!";
  }
  if(socketio == null)
  {
    throw "SocketIO is not set or null! Please use setSocketIO(io) to set it";
  }
}
