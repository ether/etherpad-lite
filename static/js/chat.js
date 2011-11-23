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

var chatAnimationIsStarted = false;

var chat = (function()
{
  var self = {
    show: function () 
    { if (chatAnimationIsStarted) return;
      chatAnimationIsStarted = true;
      $("#chaticon").hide("slide", {
        direction: "down"
      }, 500, function ()
      {
        $("#chatbox").show("slide", {
          direction: "down"
        }, 750, self.scrollDown);
        $("#chatbox").resizable(
        {
          handles: 'nw',
          start: function (event, ui)
          {
            $("#focusprotector").show();
          },
          stop: function (event, ui)
          {
            $("#focusprotector").hide();
            
            $("#chatbox").css({right: "20px", bottom: "0px", left: "", top: ""});
            
            self.scrollDown();
          }
        });
      });
    },
    hide: function () 
    {
      if (chatAnimationIsStarted) return;
      chatAnimationIsStarted = true;

      $("#chatcounter").text("0");
      $("#chatbox").hide("slide", { direction: "down" }, 750, function()
      {
        $("#chaticon").show("slide", { direction: "down" }, 500, function()
        {
          chatAnimationIsStarted = false;
        });
      });
    },
    scrollDown: function()
    {
      //console.log($('#chatbox').css("display"));

      if($('#chatbox').css("display") != "none") {
        $('#chattext').animate({scrollTop: $('#chattext')[0].scrollHeight}, "slow");
      }
      chatAnimationIsStarted = false;
    },
    send: function()
    {
      var text = $("#chatinput").val();
      pad.collabClient.sendMessage({"type": "CHAT_MESSAGE", "text": text});
      $("#chatinput").val("");
    },
    addMessage: function(msg, increment)
    {    
      //correct the time
      msg.time += pad.clientTimeOffset; 
      
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

      var text = padutils.escapeHtmlWithClickableLinks(padutils.escapeHtml(msg.text), "_blank");
      var authorName = msg.userName == null ? "unnamed" : padutils.escapeHtml(msg.userName); 
      
      var html = "<p class='" + authorClass + "'><b>" + authorName + ":</b><span class='time'>" + timeStr + "</span> " + text + "</p>";
      $("#chattext").append(html);
      
      //should we increment the counter??
      if(increment)
      {
        var count = Number($("#chatcounter").text());
        count++;
        $("#chatcounter").text(count);
        // chat throb stuff -- Just make it throb in for ~2 secs then fadeout
        $('#chatthrob').html("<b>"+authorName+"</b>" + ": " + text);
        $('#chatthrob').effect("pulsate", {times:1,mode:"hide"},2000);
      }
      
      self.scrollDown();

    },
    init: function()
    {
      $("#chaticon").mouseenter(function(){
        if (!chatAnimationIsStarted) self.show();
      });
      $("#titlecross").mouseenter(function(){
        if (!chatAnimationIsStarted) self.hide();
      });
      $("#chatbox").mouseenter(function(){
        if (!chatAnimationIsStarted) $("#chatinput").focus();
      });
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
