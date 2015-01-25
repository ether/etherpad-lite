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
      $("#chaticon").hide();
      $("#chatbox").show();
      $("#gritter-notice-wrapper").hide();
      self.scrollDown();
      chatMentions = 0;
      Tinycon.setBubble(0);
    },
    stickToScreen: function(fromInitialCall) // Make chat stick to right hand side of screen
    {
      chat.show();
      if(!isStuck || fromInitialCall) { // Stick it to
        padcookie.setPref("chatAlwaysVisible", true);
        $('#chatbox').addClass("stickyChat");
        $('#titlesticky').hide();
        $('#editorcontainer').css({"right":"192px"});
        $('.stickyChat').css("top",$('#editorcontainer').offset().top+"px");
        isStuck = true;
      } else { // Unstick it
        padcookie.setPref("chatAlwaysVisible", false);
        $('.stickyChat').css("top", "auto");
        $('#chatbox').removeClass("stickyChat");
        $('#titlesticky').show();
        $('#editorcontainer').css({"right":"0px"});
        isStuck = false;
      }
    },
    chatAndUsers: function(fromInitialCall)
    {
      if(!userAndChat || fromInitialCall){
        padcookie.setPref("chatAndUsers", true);
        chat.stickToScreen(true);
        $('#options-stickychat').prop('checked', true)
        $('#options-stickychat').prop("disabled", "disabled");
        $('#users').addClass("chatAndUsers");
        $("#chatbox").addClass("chatAndUsersChat");
        userAndChat = true;
      }else{
        padcookie.setPref("chatAndUsers", false);
        $('#options-stickychat').prop("disabled", false);
        $('#users').removeClass("chatAndUsers");
        $("#chatbox").removeClass("chatAndUsersChat");
      }
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
        $("#chaticon").show();
        $("#chatbox").hide();
        $.gritter.removeAll();
        $("#gritter-notice-wrapper").show();
      }
    },
    scrollDown: function()
    {
      if($('#chatbox').css("display") != "none"){
        if(!self.lastMessage || !self.lastMessage.position() || self.lastMessage.position().top < $('#chattext').height()) {
          $('#chattext').animate({scrollTop: $('#chattext')[0].scrollHeight}, "slow");
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
        "timeStr" : timeStr
      }

      // is the users focus already in the chatbox?
      var alreadyFocused = $("#chatinput").is(":focus");

      // does the user already have the chatbox open?
      var chatOpen = $("#chatbox").is(":visible");

      // does this message contain this user's name? (is the curretn user mentioned?)
      var myName = $('#myusernameedit').val();
      var wasMentioned = (text.toLowerCase().indexOf(myName.toLowerCase()) !== -1 && myName != "undefined");

      if(wasMentioned && !alreadyFocused && !isHistoryAdd && !chatOpen)
      { // If the user was mentioned show for twice as long and flash the browser window
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

          if(!chatOpen) {
            $.gritter.add({
              // (string | mandatory) the heading of the notification
              title: ctx.authorName,
              // (string | mandatory) the text inside the notification
              text: ctx.text,
              // (bool | optional) if you want it to fade out on its own or just sit there
              sticky: ctx.sticky,
              // (int | optional) the time you want it to be alive for before fading out
              time: '4000'
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
      $("#chatinput").keypress(function(evt)
      {
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

