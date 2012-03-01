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

var CommonCode = require('../utils/common_code');
var ERR = require("async-stacktrace");
var async = require("async");
var padManager = require("../db/PadManager");
var Changeset = CommonCode.require("/Changeset");
var AttributePoolFactory = CommonCode.require("/AttributePoolFactory");
var settings = require('../utils/Settings');
var authorManager = require("../db/AuthorManager");
var log4js = require('log4js');
var messageLogger = log4js.getLogger("message");

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

}

/**
 * Handles the disconnection of a user
 * @param client the client that leaves
 */
exports.handleDisconnect = function(client)
{
  
}

/**
 * Handles a message from a user
 * @param client the client that send this message
 * @param message the message from the client
 */
exports.handleMessage = function(client, message)
{ 
  //Check what type of message we get and delegate to the other methodes
  if(message.type == "CLIENT_READY")
  {
    handleClientReady(client, message);
  }
  else if(message.type == "CHANGESET_REQ")
  {
    handleChangesetRequest(client, message);
  }
  //if the message type is unkown, throw an exception
  else
  {
    messageLogger.warn("Dropped message, unknown Message Type: '" + message.type + "'");
  }
}

function handleClientReady(client, message)
{
  if(message.padId == null)
  {
    messageLogger.warn("Dropped message, changeset request has no padId!");
    return;
  }
  
  //send the timeslider client the clientVars, with this values its able to start
  createTimesliderClientVars (message.padId, function(err, clientVars)
  {
    ERR(err);
    
    client.json.send({type: "CLIENT_VARS", data: clientVars});
  })
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

function createTimesliderClientVars (padId, callback)
{
  var clientVars = {
    viewId: padId,
    colorPalette: ["#ffc7c7", "#fff1c7", "#e3ffc7", "#c7ffd5", "#c7ffff", "#c7d5ff", "#e3c7ff", "#ffc7f1", "#ff8f8f", "#ffe38f", "#c7ff8f", "#8fffab", "#8fffff", "#8fabff", "#c78fff", "#ff8fe3", "#d97979", "#d9c179", "#a9d979", "#79d991", "#79d9d9", "#7991d9", "#a979d9", "#d979c1", "#d9a9a9", "#d9cda9", "#c1d9a9", "#a9d9b5", "#a9d9d9", "#a9b5d9", "#c1a9d9", "#d9a9cd"],
    sliderEnabled : true,
    supportsSlider: true,
    savedRevisions: [],
    padIdForUrl: padId,
    fullWidth: false,
    disableRightBar: false,
    initialChangesets: [],
    abiwordAvailable: settings.abiwordAvailable(), 
    hooks: [],
    initialStyledContents: {}
  };
  var pad;
  var initialChangesets = [];

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
    //get all authors and add them to 
    function(callback)
    {
      var historicalAuthorData = {};
      //get all authors out of the attribut pool
      var authors = pad.getAllAuthors();
      
      //get all author data out of the database
      async.forEach(authors, function(authorId, callback)
      {
        authorManager.getAuthor(authorId, function(err, author)
        {
          if(ERR(err, callback)) return;
          historicalAuthorData[authorId] = author;
          callback();
        });
      }, function(err)
      {
        if(ERR(err, callback)) return;
        //add historicalAuthorData to the clientVars and continue
        clientVars.historicalAuthorData = historicalAuthorData;
        clientVars.initialStyledContents.historicalAuthorData = historicalAuthorData;
        callback();
      });
    },
    //get the timestamp of the last revision
    function(callback)
    {
      pad.getRevisionDate(pad.getHeadRevisionNumber(), function(err, date)
      {
        if(ERR(err, callback)) return;
        clientVars.currentTime = date;
        callback();
      });
    },
    function(callback)
    {
      //get the head revision Number
      var lastRev = pad.getHeadRevisionNumber();
      
      //add the revNum to the client Vars
      clientVars.revNum = lastRev;
      clientVars.totalRevs = lastRev;
      
      var atext = Changeset.cloneAText(pad.atext);
      var attribsForWire = Changeset.prepareForWire(atext.attribs, pad.pool);
      var apool = attribsForWire.pool.toJsonable();
      atext.attribs = attribsForWire.translated;
      
      clientVars.initialStyledContents.apool = apool;
      clientVars.initialStyledContents.atext = atext;
      
      var granularities = [100, 10, 1];

      //get the latest rough changesets
      async.forEach(granularities, function(granularity, callback)
      {
        var topGranularity = granularity*10;
        
        getChangesetInfo(padId, Math.floor(lastRev / topGranularity)*topGranularity, 
                         Math.floor(lastRev / topGranularity)*topGranularity+topGranularity, granularity, 
                         function(err, changeset)
        {
          if(ERR(err, callback)) return;
          clientVars.initialChangesets.push(changeset);
          callback();
        });
      }, callback);
    }
  ], function(err)
  {
    if(ERR(err, callback)) return;
    callback(null, clientVars);
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
  var apool = AttributePoolFactory.createAttributePool();
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
