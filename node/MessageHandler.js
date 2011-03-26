/**
 * 2011 Peter 'Pita' Martischka
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

//var token2author = {};
//var author2token = {};

var session2pad = {};
var pad2sessions = {};

var sessioninfos = {};

var socketio;

exports.setSocketIO = function(socket_io)
{
  socketio=socket_io;
}

exports.handleConnect = function(client)
{
  throwExceptionIfClientOrIOisInvalid(client);
  
  session2pad[client.sessionId]=null;  
  sessioninfos[client.sessionId]={};
}

exports.handleDisconnect = function(client)
{
  throwExceptionIfClientOrIOisInvalid(client);
  
  var sessionPad=session2pad[client.sessionId];
  
  for(i in pad2sessions[sessionPad])
  {
    if(pad2sessions[sessionPad][i] == client.sessionId)
    {
      delete pad2sessions[sessionPad][i];  
      break;
    }
  }
  
  delete session2pad[client.sessionId]; 
  delete sessioninfos[client.sessionId]; 
}

exports.handleMessage = function(client, message)
{
  throwExceptionIfClientOrIOisInvalid(client);
  
  if(message == null)
  {
    throw "Message is null!";
  }
  
  if(typeof message == "string")
  {
    message = JSON.parse(message);
  }
  
  if(!message.type)
  {
    throw "Message have no type attribute!";
  }
  
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
  else
  {
    console.error(message);
    throw "unkown Message Type: '" + message.type + "'";
  }
}

function handleUserInfoUpdate(client, message)
{
  if(message.data.userInfo.name == null)
  {
    throw "USERINFO_UPDATE Message have no name!";
  }
  if(message.data.userInfo.colorId == null)
  {
    throw "USERINFO_UPDATE Message have no colorId!";
  }
  
  var author = sessioninfos[client.sessionId].author;
  
  authorManager.setAuthorColorId(author, message.data.userInfo.colorId);
  authorManager.setAuthorName(author, message.data.userInfo.name);
}

function handleUserChanges(client, message)
{
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
  
  var baseRev = message.data.baseRev;
  var wireApool = (AttributePoolFactory.createAttributePool()).fromJsonable(message.data.apool);
  //console.error({"wireApool": wireApool});
  var changeset = message.data.changeset;
  var pad = padManager.getPad(session2pad[client.sessionId], false);
  
  //ex. _checkChangesetAndPool
  
  Changeset.checkRep(changeset);
  Changeset.eachAttribNumber(changeset, function(n) {
    if (! wireApool.getAttrib(n)) {
      throw "Attribute pool is missing attribute "+n+" for changeset "+changeset;
    }
  });
  
  //ex. adoptChangesetAttribs
  
  
  console.error({"changeset": changeset});
  //console.error({"before: pad.pool()": pad.pool()});
  Changeset.moveOpsToNewPool(changeset, wireApool, pad.pool());
  //console.error({"after: pad.pool()": pad.pool()});
  
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
  
  console.error(JSON.stringify(pad.pool()));
  
  //ex. updatePadClients
  
  //console.error({"sessioninfos[client.sessionId].author":sessioninfos[client.sessionId].author});
  
  for(i in pad2sessions[pad.id])
  {
    var session = pad2sessions[pad.id][i];
    //console.error({"session":session});
    var lastRev = sessioninfos[session].rev;
    
    while (lastRev < pad.getHeadRevisionNumber()) 
    {
      var r = ++lastRev;
      var author = pad.getRevisionAuthor(r);
      
      //console.error({"author":author});
      
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
  
  //pad.getAllAuthors();
}

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

function handleClientReady(client, message)
{
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

  var author = authorManager.getAuthor4Token(message.token);
  /*if(token2author[message.token])
  {
    author = token2author[message.token];
  }
  else
  {
    author = "g." + _randomString(16);
    
    token2author[message.token] = author;
    author2token[author] = message.token;
  }*/
  
  var sessionId=String(client.sessionId);
  session2pad[sessionId] = message.padId;
  
  if(!pad2sessions[message.padId])
  {
    pad2sessions[message.padId] = [];
  }
  
  padManager.ensurePadExists(message.padId);
  pad2sessions[message.padId].push(sessionId);
  
  /*console.dir({"session2pad": session2pad});
  console.dir({"pad2sessions": pad2sessions});
  console.dir({"token2author": token2author});
  console.dir({"author2token": author2token});*/
  
  var pad = padManager.getPad(message.padId, false);
  
  atext = pad.atext();
  var attribsForWire = Changeset.prepareForWire(atext.attribs, pad.pool());
  var apool = attribsForWire.pool.toJsonable();
  atext.attribs = attribsForWire.translated;
  
  var clientVars = {
    //"userAgent": "Anonymous Agent",
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
  
  if(authorManager.getAuthorName(author) != null)
  {
    clientVars.userName = authorManager.getAuthorName(author);
  }
  
  var allAuthors = pad.getAllAuthors();
  
  for(i in allAuthors)
  {
    clientVars.collab_client_vars.historicalAuthorData[allAuthors[i]] = {};
    if(authorManager.getAuthorName(author) != null)
      clientVars.collab_client_vars.historicalAuthorData[allAuthors[i]].name = authorManager.getAuthorName(author);
    clientVars.collab_client_vars.historicalAuthorData[allAuthors[i]].colorId = authorManager.getAuthorColorId(author);
  }
  
  client.send(clientVars);
  
  sessioninfos[client.sessionId].rev = pad.getHeadRevisionNumber();
  sessioninfos[client.sessionId].author = author;
  
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
    
  if(authorManager.getAuthorName(author) != null)
  {
    messageToTheOtherUsers.data.userInfo.name = authorManager.getAuthorName(author);
  }
  
  for(i in pad2sessions[message.padId])
  {
    if(pad2sessions[message.padId][i] != client.sessionId)
    {
      socketio.clients[pad2sessions[message.padId][i]].send(messageToTheOtherUsers);
    
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

/*function _randomString(len) {
  // use only numbers and lowercase letters
  var pieces = [];
  for(var i=0;i<len;i++) {
    pieces.push(Math.floor(Math.random()*36).toString(36).slice(-1));
  }
  return pieces.join('');
}*/

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
