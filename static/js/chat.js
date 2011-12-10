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

var chat = (function()
{
  var ua = navigator.userAgent.toLowerCase();
  var isAndroid = ua.indexOf("android") > -1;
  var isMobileSafari = ua.indexOf("mobile") > -1;
  var bottomMargin = "0px";
  var sDuration = 500;
  var hDuration = 750;
  var chatMentions = 0;
  var title = document.title;
  if (isAndroid || isMobileSafari){
   sDuration = 0;
   hDuration = 0;
  }
  var self = {
    show: function () 
    {      
      $("#chaticon").hide("slide", {
        direction: "down"
      }, hDuration, function ()
      {
        $("#chatbox").show("slide", {
          direction: "down"
        }, sDuration, self.scrollDown);
        $("#chatbox").resizable(
        {
          handles: 'nw',
          minHeight: 40,
          minWidth: 80,
          start: function (event, ui)
          {
            $("#focusprotector").show();
          },
          stop: function (event, ui)
          {
            $("#focusprotector").hide();
            
            if(isAndroid || isMobileSafari)
              bottommargin = "32px";
            
            $("#chatbox").css({right: "20px", bottom: bottomMargin, left: "", top: ""});
            
            self.scrollDown();
          }
        });
      });
      chatMentions = 0;
      document.title = title;
    },
    hide: function () 
    {
      $("#chatcounter").text("0");
      $("#chatbox").hide("slide", { direction: "down" }, sDuration, function()
      {
        $("#chaticon").show("slide", { direction: "down" }, hDuration);
      });
    },
    scrollDown: function()
    {
      if($('#chatbox').css("display") != "none")
        $('#chattext').animate({scrollTop: $('#chattext')[0].scrollHeight}, "slow");
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
      
      var html = "<p class='" + authorClass + "'><b>" + authorName + ":</b><span class='time'>" + timeStr + "</span> " + text + "</p>";
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
          $('#chatthrob').html("<b>"+authorName+"</b>" + ": " + text);
          $('#chatthrob').effect("pulsate", {times:1,mode:"hide"},4000);
          chatMentions++;
          document.title = "("+chatMentions+") " + title;
        }
        else
        {
          $('#chatthrob').html("<b>"+authorName+"</b>" + ": " + text);
          $('#chatthrob').effect("pulsate", {times:1,mode:"hide"},2000);
        }
      }
      
      self.scrollDown();

    },
    init: function()
    {
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