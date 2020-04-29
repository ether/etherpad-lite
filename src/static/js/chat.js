/**
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

var padutils = require('./pad_utils').padutils;
var padcookie = require('./pad_cookie').padcookie;
var Tinycon = require('tinycon/tinycon');
var hooks = require('./pluginfw/hooks');
var padeditor = require('./pad_editor').padeditor;

var chat = (function()
{
  var isStuck = false;
  var userAndChat = false;
  var gotInitialMessages = false;
  var historyPointer = 0;
  var chatMentions = 0;
  var self = {
    show: function ()
    {
      $("#chaticon").removeClass('visible');
      $("#chatbox").addClass('visible');
      self.scrollDown(true);
      chatMentions = 0;
      Tinycon.setBubble(0);
      $('.chat-gritter-msg').each(function() {
        $.gritter.remove(this.id);
      });
    },
    focus: function ()
    {
      setTimeout(function(){
        $("#chatinput").focus();
      },100);
    },
    stickToScreen: function(fromInitialCall) // Make chat stick to right hand side of screen
    {
      chat.show();
      isStuck = (!isStuck || fromInitialCall);
      $('#chatbox').hide();
      // Add timeout to disable the chatbox animations
      setTimeout(function() {
        $('#chatbox, .sticky-container').toggleClass("stickyChat", isStuck);
        $('#chatbox').css('display', 'flex');
      }, 0);

      padcookie.setPref("chatAlwaysVisible", isStuck);
      $('#options-stickychat').prop('checked', isStuck);
    },
    chatAndUsers: function(fromInitialCall)
    {
      var toEnable = $('#options-chatandusers').is(":checked");
      if(toEnable || !userAndChat || fromInitialCall){
        chat.stickToScreen(true);
        $('#options-stickychat').prop('checked', true)
        $('#options-chatandusers').prop('checked', true)
        $('#options-stickychat').prop("disabled", "disabled");
        userAndChat = true;
      }else{
        $('#options-stickychat').prop("disabled", false);
        userAndChat = false;
      }
      padcookie.setPref("chatAndUsers", userAndChat);
      $('#users, .sticky-container').toggleClass("chatAndUsers popup-show stickyUsers", userAndChat);
      $("#chatbox").toggleClass("chatAndUsersChat", userAndChat);
    },
    hide: function ()
    {
      // decide on hide logic based on chat window being maximized or not
      if ($('#options-stickychat').prop('checked')) {
        chat.stickToScreen();
        $('#options-stickychat').prop('checked', false);
      }
      else {
        $("#chatcounter").text("0");
        $("#chaticon").addClass('visible');
        $("#chatbox").removeClass('visible');
      }
    },
    scrollDown: function(force)
    {
      if ($('#chatbox').hasClass('visible')) {
        if (force || !self.lastMessage || !self.lastMessage.position() || self.lastMessage.position().top < ($('#chattext').outerHeight() + 20)) {
          // if we use a slow animate here we can have a race condition when a users focus can not be moved away
          // from the last message recieved.
          $('#chattext').animate({scrollTop: $('#chattext')[0].scrollHeight}, { duration: 400, queue: false });
          self.lastMessage = $('#chattext > p').eq(-1);
        }
      }
    },
    send: function()
    {
      var text = $("#chatinput").val();
      if(text.replace(/\s+/,'').length == 0)
        return;
      this._pad.collabClient.sendMessage({"type": "CHAT_MESSAGE", "text": text});
      $("#chatinput").val("");
    },
    addMessage: function(msg, increment, isHistoryAdd)
    {
      //correct the time
      msg.time += this._pad.clientTimeOffset;

      //create the time string
      var minutes = "" + new Date(msg.time).getMinutes();
      var hours = "" + new Date(msg.time).getHours();
      if(minutes.length == 1)
        minutes = "0" + minutes ;
      if(hours.length == 1)
        hours = "0" + hours ;
      var timeStr = hours + ":" + minutes;

      //create the authorclass
      if (!msg.userId) {
        /*
         * If, for a bug or a database corruption, the message coming from the
         * server does not contain the userId field (see for example #3731),
         * let's be defensive and replace it with "unknown".
         */
        msg.userId = "unknown";
        console.warn('The "userId" field of a chat message coming from the server was not present. Replacing with "unknown". This may be a bug or a database corruption.');
      }

      var authorClass = "author-" + msg.userId.replace(/[^a-y0-9]/g, function(c)
      {
        if (c == ".") return "-";
        return 'z' + c.charCodeAt(0) + 'z';
      });

      var text = padutils.escapeHtmlWithClickableLinks(msg.text, "_blank");

      var authorName = msg.userName == null ? _('pad.userlist.unnamed') : padutils.escapeHtml(msg.userName);

      // the hook args
      var ctx = {
        "authorName" : authorName,
        "author" : msg.userId,
        "text" : text,
        "sticky" : false,
        "timestamp" : msg.time,
        "timeStr" : timeStr,
        "duration" : 4000
      }

      // is the users focus already in the chatbox?
      var alreadyFocused = $("#chatinput").is(":focus");

      // does the user already have the chatbox open?
      var chatOpen = $("#chatbox").hasClass("visible");

      // does this message contain this user's name? (is the curretn user mentioned?)
      var myName = $('#myusernameedit').val();
      var wasMentioned = (text.toLowerCase().indexOf(myName.toLowerCase()) !== -1 && myName != "undefined");

      if(wasMentioned && !alreadyFocused && !isHistoryAdd && !chatOpen)
      { // If the user was mentioned, make the message sticky
        chatMentions++;
        Tinycon.setBubble(chatMentions);
        ctx.sticky = true;
      }

      // Call chat message hook
      hooks.aCallAll("chatNewMessage", ctx, function() {

        var html = "<p data-authorId='" + msg.userId + "' class='" + authorClass + "'><b>" + authorName + ":</b><span class='time " + authorClass + "'>" + ctx.timeStr + "</span> " + ctx.text + "</p>";
        if(isHistoryAdd)
          $(html).insertAfter('#chatloadmessagesbutton');
        else
          $("#chattext").append(html);

        //should we increment the counter??
        if(increment && !isHistoryAdd)
        {
          // Update the counter of unread messages
          var count = Number($("#chatcounter").text());
          count++;
          $("#chatcounter").text(count);

          if(!chatOpen && ctx.duration > 0) {
            $.gritter.add({
              text: '<span class="author-name">' + ctx.authorName + '</span>' + ctx.text,
              sticky: ctx.sticky,
              time: 5000,
              position: 'bottom',
              class_name: 'chat-gritter-msg'
            });
          }
        }
      });

      // Clear the chat mentions when the user clicks on the chat input box
      $('#chatinput').click(function(){
        chatMentions = 0;
        Tinycon.setBubble(0);
      });
      if(!isHistoryAdd)
        self.scrollDown();
    },
    init: function(pad)
    {
      this._pad = pad;
      $("#chatinput").on("keydown", function(evt){
        // If the event is Alt C or Escape & we're already in the chat menu
        // Send the users focus back to the pad
        if((evt.altKey == true && evt.which === 67) || evt.which === 27){
          // If we're in chat already..
          $(':focus').blur(); // required to do not try to remove!
          padeditor.ace.focus(); // Sends focus back to pad
          evt.preventDefault();
          return false;
        }
      });

      $('body:not(#chatinput)').on("keypress", function(evt){
        if (evt.altKey && evt.which == 67){
          // Alt c focuses on the Chat window
          $(this).blur();
          chat.show();
          $("#chatinput").focus();
          evt.preventDefault();
        }
      });

      $("#chatinput").keypress(function(evt){
        //if the user typed enter, fire the send
        if(evt.which == 13 || evt.which == 10)
        {
          evt.preventDefault();
          self.send();
        }
      });

      // initial messages are loaded in pad.js' _afterHandshake

      $("#chatcounter").text(0);
      $("#chatloadmessagesbutton").click(function()
      {
        var start = Math.max(self.historyPointer - 20, 0);
        var end = self.historyPointer;

        if(start == end) // nothing to load
          return;

        $("#chatloadmessagesbutton").css("display", "none");
        $("#chatloadmessagesball").css("display", "block");

        pad.collabClient.sendMessage({"type": "GET_CHAT_MESSAGES", "start": start, "end": end});
        self.historyPointer = start;
      });
    }
  }

  return self;
}());

exports.chat = chat;

