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

// These jQuery things should create local references, but for now `require()`
// assigns to the global `$` and augments it with plugins.
require('./jquery');
JSON = require('./json2');

var createCookie = require('./pad_utils').createCookie;
var readCookie = require('./pad_utils').readCookie;
var randomString = require('./pad_utils').randomString;
var _ = require('./underscore');
var hooks = require('./pluginfw/hooks');

var token, padId, export_links;

function init() {
  $(document).ready(function ()
  {
    // start the custom js
    if (typeof customStart == "function") customStart();

    //get the padId out of the url
    var urlParts= document.location.pathname.split("/");
    padId = decodeURIComponent(urlParts[urlParts.length-2]);

    //set the title
    document.title = padId.replace(/_+/g, ' ') + " | " + document.title;

    //ensure we have a token
    token = readCookie("token");
    if(token == null)
    {
      token = "t." + randomString();
      createCookie("token", token, 60);
    }

    var loc = document.location;
    //get the correct port
    var port = loc.port == "" ? (loc.protocol == "https:" ? 443 : 80) : loc.port;
    //create the url
    var url = loc.protocol + "//" + loc.hostname + ":" + port + "/";
    //find out in which subfolder we are
    var resource = exports.baseURL.substring(1) + 'socket.io';
    
    //build up the socket io connection
    socket = io.connect(url, {resource: resource});

    //send the ready message once we're connected
    socket.on('connect', function()
    {
      sendSocketMsg("CLIENT_READY", {});
    });

    socket.on('disconnect', function()
    {
      BroadcastSlider.showReconnectUI();
    });

    //route the incoming messages
    socket.on('message', function(message)
    {
      if(window.console) console.log(message);

      if(message.type == "CLIENT_VARS")
      {
        handleClientVars(message);
      }
      else if(message.accessStatus)
      {
        $("body").html("<h2>You have no permission to access this pad</h2>")
      } else {
        changesetLoader.handleMessageFromServer(message);
      }
    });

    //get all the export links
    export_links = $('#export > .exportlink')

    if(document.referrer.length > 0 && document.referrer.substring(document.referrer.lastIndexOf("/")-1,document.referrer.lastIndexOf("/")) === "p") {
      $("#returnbutton").attr("href", document.referrer);
    } else {
      $("#returnbutton").attr("href", document.location.href.substring(0,document.location.href.lastIndexOf("/")));
    }

    $('button#forcereconnect').click(function()
    {
      window.location.reload();
    });

    exports.socket = socket; // make the socket available
    exports.BroadcastSlider = BroadcastSlider; // Make the slider available

    hooks.aCallAll("postTimesliderInit");
  });
}

//sends a message over the socket
function sendSocketMsg(type, data)
{
  var sessionID = decodeURIComponent(readCookie("sessionID"));
  var password = readCookie("password");

  var msg = { "component" : "pad", // FIXME: Remove this stupidity!
              "type": type,
              "data": data,
              "padId": padId,
              "token": token,
              "sessionID": sessionID,
              "password": password,
              "protocolVersion": 2};

  socket.json.send(msg);
}

var fireWhenAllScriptsAreLoaded = [];
  
var changesetLoader;
function handleClientVars(message)
{
  //save the client Vars
  clientVars = message.data;
  
  //load all script that doesn't work without the clientVars
  BroadcastSlider = require('./broadcast_slider').loadBroadcastSliderJS(fireWhenAllScriptsAreLoaded);
  require('./broadcast_revisions').loadBroadcastRevisionsJS();
  changesetLoader = require('./broadcast').loadBroadcastJS(socket, sendSocketMsg, fireWhenAllScriptsAreLoaded, BroadcastSlider);

  //initialize export ui
  require('./pad_impexp').padimpexp.init();

  //change export urls when the slider moves
  BroadcastSlider.onSlider(function(revno)
  {
    // export_links is a jQuery Array, so .each is allowed.
    export_links.each(function()
    {
      this.setAttribute('href', this.href.replace( /(.+?)\/\w+\/(\d+\/)?export/ , '$1/' + padId + '/' + revno + '/export'));
    });
  });

  //fire all start functions of these scripts, formerly fired with window.load
  for(var i=0;i < fireWhenAllScriptsAreLoaded.length;i++)
  {
    fireWhenAllScriptsAreLoaded[i]();
  }
  $("#ui-slider-handle").css('left', $("#ui-slider-bar").width() - 2);
}

exports.baseURL = '';
exports.init = init;
