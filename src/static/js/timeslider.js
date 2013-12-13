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
require('./jquery.class');
//JSON = require('./json2');

var createCookie = require('./pad_utils').createCookie;
var readCookie = require('./pad_utils').readCookie;
var randomString = require('./pad_utils').randomString;
var hooks = require('./pluginfw/hooks');

var token, padId, export_links;

$.Class("SocketClient",
  { //statics
  },
  { //instance
    init: function (baseurl) {
      this.baseurl = baseurl;
      // connect to the server
      console.log("[socket_client] connecting to:", this.baseurl);
      this.socket = io.connect(this.baseurl, {resource: "socket.io"});
      // setup the socket callbacks:
      _this = this;

      this.socket.on("connect", function() {
        _this.onConnect.apply(_this, arguments);
      });
      this.socket.on("disconnect", function() {
        _this.onDisconnect.apply(_this, arguments);
      });
      this.socket.on("message", function(message) {
        _this.onMessage.apply(_this, arguments);
      });
    },

    onConnect: function() {
      console.log("[socket_client] > onConnect");
    },

    onDisconnect: function() {
      console.log("[socket_client] > onDisconnect");
    },

    /**
     * Triggered when a new message arrives from the server.
     * @param {object} message - The message.
     */
    onMessage: function(message) {
      console.log("[socket_client] > onMessage: ", message);
    },

    /**
     * Sends a message to the server.
     * @param {object} message - The message to send
     * @param {function} callback - A callback function which will be called after
     * the message has been sent to the socket.
     */
    sendMessage: function(message, callback) {
      console.log("[socket_client] > sendMessage: ", message);
      this.socket.json.send(message);
      if (callback)
        callback();
    },
  }
);

SocketClient("AuthenticatedSocketClient",
  { //statics
  },
  { //instance
    init: function (baseurl, padID) {

      //make sure we have a token
      this.token = readCookie("token");
      if(this.token === null)
      {
        this.token = "t." + randomString();
        createCookie("token", this.token, 60);
      }
      this.padID = padID;
      this.sessionID = decodeURIComponent(readCookie("sessionID"));
      this.password = readCookie("password");
      this.handlers = {};

      this._super(baseurl);
    },

    /**
     * Sends a pad message to the server, including all the neccessary
     * session info and tokens.
     * @param {string} type - The message type to send. See the server code for
     *                        valid message types.
     * @param {object} data - The data payload to be sent to the server.
     * @param {function} callback - A callback function which will be called after
     *                              the message has been sent to the socket.
     */
    sendMessage: function (type, data, callback) {
      this.sessionID = decodeURIComponent(readCookie("sessionID"));
      this.password = readCookie("password");
      var msg = { "component" : "pad", // FIXME: Remove this stupidity!
                  "type": type,
                  "data": data,
                  "padId": this.padID,
                  "token": this.token,
                  "sessionID": this.sessionID,
                  "password": this.password,
                  "protocolVersion": 2};
      this._super(msg, callback);
    },

    onMessage: function (message) {
      console.log("[authorized_client] > onMessage:", message);
      if (message.accessStatus)
      { //access denied?
        //TODO raise some kind of error?
        console.log("ACCESS ERROR!");
      }
      this.dispatchMessage(message.type, message.data);
    },

    /**
     * Dispatch incoming messages to handlers in subclasses or registered
     * as event handlers.
     * @param {string} type - The type of the message. See the server code
     *                        for possible values.
     * @param {object} data - The message payload.
     */
    dispatchMessage: function(type, data) {
      console.log("[authorized_client] > dispatchMessage('%s', %s)", type, data);
      // first call local handlers
      if ("handle_" + type in this)
        this["handle_" + type](data);
      // then call registered handlers
      if (type in this.handlers)
        for(var h in this.handlers[type])
        { //TODO: maybe chain the handlers into some kind of chain-of-responsibility?
          var handler = this.handlers[type][h];
          handler.handler.call(this, data, handler.context);
        }
    },

    /**
     * Register an event handler for a given message type.
     * @param {string} type - The message type.
     * @param {function} handler - The handler function.
     * @param {object} context - Optionally, some context to be passed to the handler.
     */
    on: function(type, handler, context) {
      if (!(type in this.handlers))
        this.handlers[type] = [];
      this.handlers[type].push({handler: handler, context: context});
      return this;
    },

  }
);

require('./revisioncache');
AuthenticatedSocketClient("TimesliderClient",
  { //statics
  },
  { //instance
    init: function (baseurl, padID) {
      this._super(baseurl, padID);
    },

    onConnect: function () {
      this.sendMessage("CLIENT_READY", {}, function() { console.log("CLIENT_READY sent");});
    },

    // ------------------------------------------
    // Handling events
    handle_CLIENT_VARS: function(data) {
      console.log("[timeslider_client] handle_CLIENT_VARS: ", data);
      this.clientVars = data;
      this.current_revision = this.head_revision = this.clientVars.collab_client_vars.rev;
      this.savedRevisions = this.clientVars.savedRevisions;

      this.revisionCache = new RevisionCache(this, this.clientVars.collab_client_vars.rev || 0);

      var collabClientVars = this.clientVars.collab_client_vars;
      this.padClient = new PadClient(collabClientVars.rev, collabClientVars.time, collabClientVars.initialAttributedText.text, collabClientVars.initialAttributedText.attribs, collabClientVars.apool);
    },

    handle_COLLABROOM: function(data) {
      console.log("[timeslider_client] handle_COLLABROOM: ", data);
    },
  }
);

function init(baseURL) {
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
    if(token === null)
    {
      token = "t." + randomString();
      createCookie("token", token, 60);
    }

    var loc = document.location;
    //get the correct port
    var port = loc.port === "" ? (loc.protocol == "https:" ? 443 : 80) : loc.port;
    //create the url
    var url = loc.protocol + "//" + loc.hostname + ":" + port + "/";
    //find out in which subfolder we are
    var resource = baseURL.substring(1) + 'socket.io';

    var cl;
    console.log(url, baseURL, resource, padId);
    var timesliderclient = new TimesliderClient(url, padId)
        .on("CLIENT_VARS", function(data, context, callback) {
          //load all script that doesn't work without the clientVars
          BroadcastSlider = require('./broadcast_slider').init(this,fireWhenAllScriptsAreLoaded);
          //cl = require('./revisioncache').init(this.clientVars, this);
          //changesetLoader = require('./broadcast').loadBroadcastJS(this, fireWhenAllScriptsAreLoaded, BroadcastSlider);

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
          //$("#ui-slider-handle").css('left', $("#ui-slider-bar").width() - 2);
        });

    //get all the export links
    export_links = $('#export > .exportlink');

    if(document.referrer.length > 0 && document.referrer.substring(document.referrer.lastIndexOf("/")-1,document.referrer.lastIndexOf("/")) === "p") {
      $("#returnbutton").attr("href", document.referrer);
    } else {
      $("#returnbutton").attr("href", document.location.href.substring(0,document.location.href.lastIndexOf("/")));
    }

    $('button#forcereconnect').click(function()
    {
      window.location.reload();
    });

    //exports.socket = socket; // make the socket available
    exports.BroadcastSlider = BroadcastSlider; // Make the slider available

    hooks.aCallAll("postTimesliderInit");
  });
}

var fireWhenAllScriptsAreLoaded = [];

exports.init = init;
