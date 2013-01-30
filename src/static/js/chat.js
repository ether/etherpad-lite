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

var chat = (function()
{
  var isStuck = false;
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
        $('#chattext').css({"top":"0px"});
        $('#editorcontainer').css({"right":"192px", "width":"auto"});
        isStuck = true;
      } else { // Unstick it
        padcookie.setPref("chatAlwaysVisible", false);
        $('#chatbox').removeClass("stickyChat");
        $('#chattext').css({"top":"25px"});
        $('#editorcontainer').css({"right":"0px", "width":"100%"});
        isStuck = false;
      }
    },
    hide: function () 
    {
      $("#chatcounter").text("0");
      $("#chaticon").show();
      $("#chatbox").hide();
      $.gritter.removeAll();
      $("#gritter-notice-wrapper").show();
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

      /* Performs an action if your name is mentioned */
      var myName = $('#myusernameedit').val();
      myName = myName.toLowerCase();
      var chatText = text.toLowerCase();
      var wasMentioned = false;
      if (chatText.indexOf(myName) !== -1 && myName != "undefined"){
        wasMentioned = true;
      }
      /* End of new action */

      var authorName = msg.userName == null ? _('pad.userlist.unnamed') : padutils.escapeHtml(msg.userName); 
      
      var html = "<p class='" + authorClass + "'><b>" + authorName + ":</b><span class='time " + authorClass + "'>" + timeStr + "</span> " + text + "</p>";
      if(isHistoryAdd)
        $(html).insertAfter('#chatloadmessagesbutton');
      else
        $("#chattext").append(html);
      
      //should we increment the counter??
      if(increment && !isHistoryAdd)
      {
        var count = Number($("#chatcounter").text());
        count++;
        
        // is the users focus already in the chatbox?
        var alreadyFocused = $("#chatinput").is(":focus");
        
        // does the user already have the chatbox open?
        var chatOpen = $("#chatbox").is(":visible");

        $("#chatcounter").text(count);
        // chat throb stuff -- Just make it throw for twice as long
        if(wasMentioned && !alreadyFocused && !isHistoryAdd && !chatOpen)
        { // If the user was mentioned show for twice as long and flash the browser window
          $.gritter.add({
            // (string | mandatory) the heading of the notification
            title: authorName,
            // (string | mandatory) the text inside the notification
            text: text,
            // (bool | optional) if you want it to fade out on its own or just sit there
            sticky: true,
            // (int | optional) the time you want it to be alive for before fading out
            time: '2000'
          });

          chatMentions++;
          Tinycon.setBubble(chatMentions);
        }
        else
        {
          if(!chatOpen){
            $.gritter.add({
              // (string | mandatory) the heading of the notification
              title: authorName,
              // (string | mandatory) the text inside the notification
              text: text,

              // (bool | optional) if you want it to fade out on its own or just sit there
              sticky: false,
              // (int | optional) the time you want it to be alive for before fading out
              time: '4000'
            });
            Tinycon.setBubble(count);

          }
        }
      }
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

