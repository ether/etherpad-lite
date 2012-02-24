/**
 * This code is mostly from the old Etherpad. Please help us to comment this code. 
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

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

var padutils = require('/pad_utils').padutils;
var padcookie = require('/pad_cookie').padcookie;

var chat = (function()
{
  var isStuck = false;
  var chatMentions = 0;
  var title = document.title;
  var self = {
    show: function () 
    {      
      $("#chaticon").hide();
      $("#chatbox").show();
      self.scrollDown();
      chatMentions = 0;
      document.title = title;
    },
    stickToScreen: function(fromInitialCall) // Make chat stick to right hand side of screen
    {
      chat.show();
      if(!isStuck || fromInitialCall) { // Stick it to
        padcookie.setPref("chatAlwaysVisible", true);
        $('#chatbox').css({"right":"0px", "top":"36px", "border-radius":"0px", "height":"auto", "border-right":"none", "border-left":"1px solid #ccc", "border-top":"none", "background-color":"#f1f1f1", "width":"185px"});
        $('#chattext').css({"top":"0px"});
        $('#editorcontainer').css({"right":"192px", "width":"auto"});
        isStuck = true;
      } else { // Unstick it
        padcookie.setPref("chatAlwaysVisible", false);
        $('#chatbox').css({"right":"20px", "top":"auto", "border-top-left-radius":"5px", "border-top-right-radius":"5px", "border-right":"1px solid #999", "height":"200px", "border-top":"1px solid #999", "background-color":"#f7f7f7"});
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
    },
    scrollDown: function()
    {
      if($('#chatbox').css("display") != "none")
        $('#chattext').animate({scrollTop: $('#chattext')[0].scrollHeight}, "slow");
    }, 
    send: function()
    {
      var text = $("#chatinput").val();
      this._pad.collabClient.sendMessage({"type": "CHAT_MESSAGE", "text": text});
      $("#chatinput").val("");
    },
    addMessage: function(msg, increment)
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

      var authorName = msg.userName == null ? "unnamed" : padutils.escapeHtml(msg.userName); 
      
      var html = "<p class='" + authorClass + "'><b>" + authorName + ":</b><span class='time " + authorClass + "'>" + timeStr + "</span> " + text + "</p>";
      $("#chattext").append(html);
      
      //should we increment the counter??
      if(increment)
      {
        var count = Number($("#chatcounter").text());
        count++;
        $("#chatcounter").text(count);
        // chat throb stuff -- Just make it throw for twice as long
        if(wasMentioned)
        { // If the user was mentioned show for twice as long and flash the browser window
          if (chatMentions == 0){
            title = document.title;
          }
          $('#chatthrob').html("<b>"+authorName+"</b>" + ": " + text).show().delay(4000).hide(400);
          chatMentions++;
          document.title = "("+chatMentions+") " + title;
        }
        else
        {
          $('#chatthrob').html("<b>"+authorName+"</b>" + ": " + text).show().delay(2000).hide(400);
        }
      }
      
      self.scrollDown();

    },
    init: function(pad)
    {
      this._pad = pad;
      $("#chatinput").keypress(function(evt)
      {
        //if the user typed enter, fire the send
        if(evt.which == 13)
        {
          evt.preventDefault();
          self.send();
        }
      });
      
      for(var i in clientVars.chatHistory)
      {
        this.addMessage(clientVars.chatHistory[i], false);
      }
      $("#chatcounter").text(clientVars.chatHistory.length);
    }
  }

  return self;
}());

exports.chat = chat;

