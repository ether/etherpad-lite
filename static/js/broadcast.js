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

var makeCSSManager = require('/cssmanager_client').makeCSSManager;
var domline = require('/domline_client').domline;
var Changeset = require('/easysync2_client').Changeset;
var AttribPool = require('/easysync2_client').AttribPool;
var linestylefilter = require('/linestylefilter_client').linestylefilter;

// These parameters were global, now they are injected. A reference to the
// Timeslider controller would probably be more appropriate.
function loadBroadcastJS(socket, sendSocketMsg, fireWhenAllScriptsAreLoaded, BroadcastSlider)
{
  var changesetLoader = undefined;
  // just in case... (todo: this must be somewhere else in the client code.)
  // Below Array#map code was direct pasted by AppJet/Etherpad, licence unknown. Possible source: http://www.tutorialspoint.com/javascript/array_map.htm
  if (!Array.prototype.map)
  {
    Array.prototype.map = function(fun /*, thisp*/ )
    {
      var len = this.length >>> 0;
      if (typeof fun != "function") throw new TypeError();

      var res = new Array(len);
      var thisp = arguments[1];
      for (var i = 0; i < len; i++)
      {
        if (i in this) res[i] = fun.call(thisp, this[i], i, this);
      }

      return res;
    };
  }

  // Below Array#forEach code was direct pasted by AppJet/Etherpad, licence unknown. Possible source: http://www.tutorialspoint.com/javascript/array_foreach.htm
  if (!Array.prototype.forEach)
  {
    Array.prototype.forEach = function(fun /*, thisp*/ )
    {
      var len = this.length >>> 0;
      if (typeof fun != "function") throw new TypeError();

      var thisp = arguments[1];
      for (var i = 0; i < len; i++)
      {
        if (i in this) fun.call(thisp, this[i], i, this);
      }
    };
  }

  // Below Array#indexOf code was direct pasted by AppJet/Etherpad, licence unknown. Possible source: http://www.tutorialspoint.com/javascript/array_indexof.htm
  if (!Array.prototype.indexOf)
  {
    Array.prototype.indexOf = function(elt /*, from*/ )
    {
      var len = this.length >>> 0;

      var from = Number(arguments[1]) || 0;
      from = (from < 0) ? Math.ceil(from) : Math.floor(from);
      if (from < 0) from += len;

      for (; from < len; from++)
      {
        if (from in this && this[from] === elt) return from;
      }
      return -1;
    };
  }

  function debugLog()
  {
    try
    {
      if (window.console) console.log.apply(console, arguments);
    }
    catch (e)
    {
      if (window.console) console.log("error printing: ", e);
    }
  }

  function randomString()
  {
    return "_" + Math.floor(Math.random() * 1000000);
  }

  // for IE
  if ($.browser.msie)
  {
    try
    {
      document.execCommand("BackgroundImageCache", false, true);
    }
    catch (e)
    {}
  }

  var userId = "hiddenUser" + randomString();
  var socketId;
  //var socket;
  var channelState = "DISCONNECTED";

  var appLevelDisconnectReason = null;

  var padContents = {
    currentRevision: clientVars.revNum,
    currentTime: clientVars.currentTime,
    currentLines: Changeset.splitTextLines(clientVars.initialStyledContents.atext.text),
    currentDivs: null,
    // to be filled in once the dom loads
    apool: (new AttribPool()).fromJsonable(clientVars.initialStyledContents.apool),
    alines: Changeset.splitAttributionLines(
    clientVars.initialStyledContents.atext.attribs, clientVars.initialStyledContents.atext.text),

    // generates a jquery element containing HTML for a line
    lineToElement: function(line, aline)
    {
      var element = document.createElement("div");
      var emptyLine = (line == '\n');
      var domInfo = domline.createDomLine(!emptyLine, true);
      linestylefilter.populateDomLine(line, aline, this.apool, domInfo);
      domInfo.prepareForAdd();
      element.className = domInfo.node.className;
      element.innerHTML = domInfo.node.innerHTML;
      element.id = Math.random();
      return $(element);
    },

    applySpliceToDivs: function(start, numRemoved, newLines)
    {
      // remove spliced-out lines from DOM
      for (var i = start; i < start + numRemoved && i < this.currentDivs.length; i++)
      {
        debugLog("removing", this.currentDivs[i].attr('id'));
        this.currentDivs[i].remove();
      }

      // remove spliced-out line divs from currentDivs array
      this.currentDivs.splice(start, numRemoved);

      var newDivs = [];
      for (var i = 0; i < newLines.length; i++)
      {
        newDivs.push(this.lineToElement(newLines[i], this.alines[start + i]));
      }

      // grab the div just before the first one
      var startDiv = this.currentDivs[start - 1] || null;

      // insert the div elements into the correct place, in the correct order
      for (var i = 0; i < newDivs.length; i++)
      {
        if (startDiv)
        {
          startDiv.after(newDivs[i]);
        }
        else
        {
          $("#padcontent").prepend(newDivs[i]);
        }
        startDiv = newDivs[i];
      }

      // insert new divs into currentDivs array
      newDivs.unshift(0); // remove 0 elements
      newDivs.unshift(start);
      this.currentDivs.splice.apply(this.currentDivs, newDivs);
      return this;
    },

    // splice the lines
    splice: function(start, numRemoved, newLinesVA)
    {
      var newLines = Array.prototype.slice.call(arguments, 2).map(

      function(s)
      {
        return s;
      });

      // apply this splice to the divs
      this.applySpliceToDivs(start, numRemoved, newLines);

      // call currentLines.splice, to keep the currentLines array up to date
      newLines.unshift(numRemoved);
      newLines.unshift(start);
      this.currentLines.splice.apply(this.currentLines, arguments);
    },
    // returns the contents of the specified line I
    get: function(i)
    {
      return this.currentLines[i];
    },
    // returns the number of lines in the document
    length: function()
    {
      return this.currentLines.length;
    },

    getActiveAuthors: function()
    {
      var self = this;
      var authors = [];
      var seenNums = {};
      var alines = self.alines;
      for (var i = 0; i < alines.length; i++)
      {
        Changeset.eachAttribNumber(alines[i], function(n)
        {
          if (!seenNums[n])
          {
            seenNums[n] = true;
            if (self.apool.getAttribKey(n) == 'author')
            {
              var a = self.apool.getAttribValue(n);
              if (a)
              {
                authors.push(a);
              }
            }
          }
        });
      }
      authors.sort();
      return authors;
    }
  };

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
        // caughtErrors.push(e);
        // caughtErrorCatchers.push(catcher);
        // caughtErrorTimes.push(+new Date());
        // console.dir({catcher: catcher, e: e});
        debugLog(e); // TODO(kroo): added temporary, to catch errors
        throw e;
      }
    };
  }

  function loadedNewChangeset(changesetForward, changesetBackward, revision, timeDelta)
  {
    var broadcasting = (BroadcastSlider.getSliderPosition() == revisionInfo.latest);
    debugLog("broadcasting:", broadcasting, BroadcastSlider.getSliderPosition(), revisionInfo.latest, revision);
    revisionInfo.addChangeset(revision, revision + 1, changesetForward, changesetBackward, timeDelta);
    BroadcastSlider.setSliderLength(revisionInfo.latest);
    if (broadcasting) applyChangeset(changesetForward, revision + 1, false, timeDelta);
  }

/*
   At this point, we must be certain that the changeset really does map from
   the current revision to the specified revision.  Any mistakes here will
   cause the whole slider to get out of sync.
   */

  function applyChangeset(changeset, revision, preventSliderMovement, timeDelta)
  {
    // disable the next 'gotorevision' call handled by a timeslider update
    if (!preventSliderMovement)
    {
      goToRevisionIfEnabledCount++;
      BroadcastSlider.setSliderPosition(revision);
    }

    try
    {
      // must mutate attribution lines before text lines
      Changeset.mutateAttributionLines(changeset, padContents.alines, padContents.apool);
    }
    catch (e)
    {
      debugLog(e);
    }

    Changeset.mutateTextLines(changeset, padContents);
    padContents.currentRevision = revision;
    padContents.currentTime += timeDelta * 1000;
    debugLog('Time Delta: ', timeDelta)
    updateTimer();
    BroadcastSlider.setAuthors(padContents.getActiveAuthors().map(function(name)
    {
      return authorData[name];
    }));
  }

  function updateTimer()
  {
    var zpad = function(str, length)
      {
        str = str + "";
        while (str.length < length)
        str = '0' + str;
        return str;
        }
        
        
        
    var date = new Date(padContents.currentTime);
    var dateFormat = function()
      {
        var month = zpad(date.getMonth() + 1, 2);
        var day = zpad(date.getDate(), 2);
        var year = (date.getFullYear());
        var hours = zpad(date.getHours(), 2);
        var minutes = zpad(date.getMinutes(), 2);
        var seconds = zpad(date.getSeconds(), 2);
        return ([month, '/', day, '/', year, ' ', hours, ':', minutes, ':', seconds].join(""));
        }
        
        
        
        
        
    $('#timer').html(dateFormat());

    var revisionDate = ["Saved", ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"][date.getMonth()], date.getDate() + ",", date.getFullYear()].join(" ")
    $('#revision_date').html(revisionDate)

  }
  
  updateTimer();

  function goToRevision(newRevision)
  {
    padContents.targetRevision = newRevision;
    var self = this;
    var path = revisionInfo.getPath(padContents.currentRevision, newRevision);
    debugLog('newRev: ', padContents.currentRevision, path);
    if (path.status == 'complete')
    {
      var cs = path.changesets;
      debugLog("status: complete, changesets: ", cs, "path:", path);
      var changeset = cs[0];
      var timeDelta = path.times[0];
      for (var i = 1; i < cs.length; i++)
      {
        changeset = Changeset.compose(changeset, cs[i], padContents.apool);
        timeDelta += path.times[i];
      }
      if (changeset) applyChangeset(changeset, path.rev, true, timeDelta);
    }
    else if (path.status == "partial")
    {
      debugLog('partial');
      var sliderLocation = padContents.currentRevision;
      // callback is called after changeset information is pulled from server
      // this may never get called, if the changeset has already been loaded
      var update = function(start, end)
        {
          // if we've called goToRevision in the time since, don't goToRevision
          goToRevision(padContents.targetRevision);
          };

      // do our best with what we have...
      var cs = path.changesets;

      var changeset = cs[0];
      var timeDelta = path.times[0];
      for (var i = 1; i < cs.length; i++)
      {
        changeset = Changeset.compose(changeset, cs[i], padContents.apool);
        timeDelta += path.times[i];
      }
      if (changeset) applyChangeset(changeset, path.rev, true, timeDelta);


      if (BroadcastSlider.getSliderLength() > 10000)
      {
        var start = (Math.floor((newRevision) / 10000) * 10000); // revision 0 to 10
        changesetLoader.queueUp(start, 100);
      }

      if (BroadcastSlider.getSliderLength() > 1000)
      {
        var start = (Math.floor((newRevision) / 1000) * 1000); // (start from -1, go to 19) + 1
        changesetLoader.queueUp(start, 10);
      }

      start = (Math.floor((newRevision) / 100) * 100);

      changesetLoader.queueUp(start, 1, update);
    }
    BroadcastSlider.setAuthors(padContents.getActiveAuthors().map(function(name)
    {
      return authorData[name];
    }));
  }

  changesetLoader = {
    running: false,
    resolved: [],
    requestQueue1: [],
    requestQueue2: [],
    requestQueue3: [],
    reqCallbacks: [],
    queueUp: function(revision, width, callback)
    {
      if (revision < 0) revision = 0;
      // if(changesetLoader.requestQueue.indexOf(revision) != -1)
      //   return; // already in the queue.
      if (changesetLoader.resolved.indexOf(revision + "_" + width) != -1) return; // already loaded from the server
      changesetLoader.resolved.push(revision + "_" + width);

      var requestQueue = width == 1 ? changesetLoader.requestQueue3 : width == 10 ? changesetLoader.requestQueue2 : changesetLoader.requestQueue1;
      requestQueue.push(
      {
        'rev': revision,
        'res': width,
        'callback': callback
      });
      if (!changesetLoader.running)
      {
        changesetLoader.running = true;
        setTimeout(changesetLoader.loadFromQueue, 10);
      }
    },
    loadFromQueue: function()
    {
      var self = changesetLoader;
      var requestQueue = self.requestQueue1.length > 0 ? self.requestQueue1 : self.requestQueue2.length > 0 ? self.requestQueue2 : self.requestQueue3.length > 0 ? self.requestQueue3 : null;

      if (!requestQueue)
      {
        self.running = false;
        return;
      }

      var request = requestQueue.pop();
      var granularity = request.res;
      var callback = request.callback;
      var start = request.rev;
      var requestID = Math.floor(Math.random() * 100000);

/*var msg = { "component" : "timeslider",
                  "type":"CHANGESET_REQ", 
                  "padId": padId,
                  "token": token,
                  "protocolVersion": 2, 
                  "data"
                  {
                    "start": start,
                    "granularity": granularity
                  }};
    
      socket.send(msg);*/

      sendSocketMsg("CHANGESET_REQ", {
        "start": start,
        "granularity": granularity,
        "requestID": requestID
      });

      self.reqCallbacks[requestID] = callback;

/*debugLog("loadinging revision", start, "through ajax");
      $.getJSON("/ep/pad/changes/" + clientVars.padIdForUrl + "?s=" + start + "&g=" + granularity, function (data, textStatus)
      {
        if (textStatus !== "success")
        {
          console.log(textStatus);
          BroadcastSlider.showReconnectUI();
        }
        self.handleResponse(data, start, granularity, callback);

        setTimeout(self.loadFromQueue, 10); // load the next ajax function
      });*/
    },
    handleSocketResponse: function(message)
    {
      var self = changesetLoader;

      var start = message.data.start;
      var granularity = message.data.granularity;
      var callback = self.reqCallbacks[message.data.requestID];
      delete self.reqCallbacks[message.data.requestID];

      self.handleResponse(message.data, start, granularity, callback);
      setTimeout(self.loadFromQueue, 10);
    },
    handleResponse: function(data, start, granularity, callback)
    {
      debugLog("response: ", data);
      var pool = (new AttribPool()).fromJsonable(data.apool);
      for (var i = 0; i < data.forwardsChangesets.length; i++)
      {
        var astart = start + i * granularity - 1; // rev -1 is a blank single line
        var aend = start + (i + 1) * granularity - 1; // totalRevs is the most recent revision
        if (aend > data.actualEndNum - 1) aend = data.actualEndNum - 1;
        debugLog("adding changeset:", astart, aend);
        var forwardcs = Changeset.moveOpsToNewPool(data.forwardsChangesets[i], pool, padContents.apool);
        var backwardcs = Changeset.moveOpsToNewPool(data.backwardsChangesets[i], pool, padContents.apool);
        revisionInfo.addChangeset(astart, aend, forwardcs, backwardcs, data.timeDeltas[i]);
      }
      if (callback) callback(start - 1, start + data.forwardsChangesets.length * granularity - 1);
    }
  };

  function handleMessageFromServer()
  {
    debugLog("handleMessage:", arguments);
    var obj = arguments[0]['data'];
    var expectedType = "COLLABROOM";

    obj = JSON.parse(obj);
    if (obj['type'] == expectedType)
    {
      obj = obj['data'];

      if (obj['type'] == "NEW_CHANGES")
      {
        debugLog(obj);
        var changeset = Changeset.moveOpsToNewPool(
        obj.changeset, (new AttribPool()).fromJsonable(obj.apool), padContents.apool);

        var changesetBack = Changeset.moveOpsToNewPool(
        obj.changesetBack, (new AttribPool()).fromJsonable(obj.apool), padContents.apool);

        loadedNewChangeset(changeset, changesetBack, obj.newRev - 1, obj.timeDelta);
      }
      else if (obj['type'] == "NEW_AUTHORDATA")
      {
        var authorMap = {};
        authorMap[obj.author] = obj.data;
        receiveAuthorData(authorMap);
        BroadcastSlider.setAuthors(padContents.getActiveAuthors().map(function(name)
        {
          return authorData[name];
        }));
      }
      else if (obj['type'] == "NEW_SAVEDREV")
      {
        var savedRev = obj.savedRev;
        BroadcastSlider.addSavedRevision(savedRev.revNum, savedRev);
      }
    }
    else
    {
      debugLog("incorrect message type: " + obj['type'] + ", expected " + expectedType);
    }
  }

  function handleSocketClosed(params)
  {
    debugLog("socket closed!", params);
    socket = null;

    BroadcastSlider.showReconnectUI();
    // var reason = appLevelDisconnectReason || params.reason;
    // var shouldReconnect = params.reconnect;
    // if (shouldReconnect) {
    //   // determine if this is a tight reconnect loop due to weird connectivity problems
    //   // reconnectTimes.push(+new Date());
    //   var TOO_MANY_RECONNECTS = 8;
    //   var TOO_SHORT_A_TIME_MS = 10000;
    //   if (reconnectTimes.length >= TOO_MANY_RECONNECTS &&
    //       ((+new Date()) - reconnectTimes[reconnectTimes.length-TOO_MANY_RECONNECTS]) <
    //       TOO_SHORT_A_TIME_MS) {
    //      setChannelState("DISCONNECTED", "looping");
    //   }
    //   else {
    //      setChannelState("RECONNECTING", reason);
    //      setUpSocket();
    //   }
    // }
    // else {
    //   BroadcastSlider.showReconnectUI();
    //   setChannelState("DISCONNECTED", reason);
    // }
  }

  function sendMessage(msg)
  {
    socket.postMessage(JSON.stringify(
    {
      type: "COLLABROOM",
      data: msg
    }));
  }

/*function setUpSocket()
  {
    // required for Comet
    if ((!$.browser.msie) && (!($.browser.mozilla && $.browser.version.indexOf("1.8.") == 0)))
    {
      document.domain = document.domain; // for comet
    }

    var success = false;
    callCatchingErrors("setUpSocket", function ()
    {
      appLevelDisconnectReason = null;

      socketId = String(Math.floor(Math.random() * 1e12));
      socket = new WebSocket(socketId);
      socket.onmessage = wrapRecordingErrors("socket.onmessage", handleMessageFromServer);
      socket.onclosed = wrapRecordingErrors("socket.onclosed", handleSocketClosed);
      socket.onopen = wrapRecordingErrors("socket.onopen", function ()
      {
        setChannelState("CONNECTED");
        var msg = {
          type: "CLIENT_READY",
          roomType: 'padview',
          roomName: 'padview/' + clientVars.viewId,
          data: {
            lastRev: clientVars.revNum,
            userInfo: {
              userId: userId
            }
          }
        };
        sendMessage(msg);
      });
      // socket.onhiccup = wrapRecordingErrors("socket.onhiccup", handleCometHiccup);
      // socket.onlogmessage = function(x) {debugLog(x); };
      socket.connect();
      success = true;
    });
    if (success)
    {
      //initialStartConnectTime = +new Date();
    }
    else
    {
      abandonConnection("initsocketfail");
    }
  }*/

  function setChannelState(newChannelState, moreInfo)
  {
    if (newChannelState != channelState)
    {
      channelState = newChannelState;
      // callbacks.onChannelStateChange(channelState, moreInfo);
    }
  }

  function abandonConnection(reason)
  {
    if (socket)
    {
      socket.onclosed = function()
      {};
      socket.onhiccup = function()
      {};
      socket.disconnect();
    }
    socket = null;
    setChannelState("DISCONNECTED", reason);
  }

/*window['onloadFuncts'] = [];
  window.onload = function ()
  {
    window['isloaded'] = true;
    window['onloadFuncts'].forEach(function (funct)
    {
      funct();
    });
  };*/

  // to start upon window load, just push a function onto this array
  //window['onloadFuncts'].push(setUpSocket);
  //window['onloadFuncts'].push(function ()
  fireWhenAllScriptsAreLoaded.push(function()
  {
    // set up the currentDivs and DOM
    padContents.currentDivs = [];
    $("#padcontent").html("");
    for (var i = 0; i < padContents.currentLines.length; i++)
    {
      var div = padContents.lineToElement(padContents.currentLines[i], padContents.alines[i]);
      padContents.currentDivs.push(div);
      $("#padcontent").append(div);
    }
    debugLog(padContents.currentDivs);
  });

  // this is necessary to keep infinite loops of events firing,
  // since goToRevision changes the slider position
  var goToRevisionIfEnabledCount = 0;
  var goToRevisionIfEnabled = function()
    {
      if (goToRevisionIfEnabledCount > 0)
      {
        goToRevisionIfEnabledCount--;
      }
      else
      {
        goToRevision.apply(goToRevision, arguments);
      }
      }
      
      
      
      
      
  BroadcastSlider.onSlider(goToRevisionIfEnabled);

  (function()
  {
    for (var i = 0; i < clientVars.initialChangesets.length; i++)
    {
      var csgroup = clientVars.initialChangesets[i];
      var start = clientVars.initialChangesets[i].start;
      var granularity = clientVars.initialChangesets[i].granularity;
      debugLog("loading changest on startup: ", start, granularity, csgroup);
      changesetLoader.handleResponse(csgroup, start, granularity, null);
    }
  })();

  var dynamicCSS = makeCSSManager('dynamicsyntax');
  var authorData = {};

  function receiveAuthorData(newAuthorData)
  {
    for (var author in newAuthorData)
    {
      var data = newAuthorData[author];
      var bgcolor = typeof data.colorId == "number" ? clientVars.colorPalette[data.colorId] : data.colorId;
      if (bgcolor && dynamicCSS)
      {
        dynamicCSS.selectorStyle('.' + linestylefilter.getAuthorClassName(author)).backgroundColor = bgcolor;
      }
      authorData[author] = data;
    }
  }

  receiveAuthorData(clientVars.historicalAuthorData);

  return changesetLoader;
}

exports.loadBroadcastJS = loadBroadcastJS;
