var chat = (function()
{
  var self = {
    show: function () 
    {      
      $("#chaticon").hide("slide", { direction: "down" }, 500, function()
      {
        $("#chatbox").show("slide", { direction: "down" }, 750, self.scrollDown);
      });
    },
    hide: function () 
    {
      $("#chatcounter").text("0");
      $("#chatbox").hide("slide", { direction: "down" }, 750, function()
      {
        $("#chaticon").show("slide", { direction: "down" }, 500);
      });
    },
    scrollDown: function()
    {
      console.log($('#chatbox').css("display"));
    
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
      var authorName = msg.userName == null ? "unnamed" : padutils.escapeHtml(msg.userName); 
      
      var html = "<p class='" + authorClass + "'><b>" + authorName + ":</b><span class='time'>" + timeStr + "</span> " + text + "</p>";
      $("#chattext").append(html);
      
      //should we increment the counter??
      if(increment)
      {
        var count = Number($("#chatcounter").text());
        count++;
        $("#chatcounter").text(count);
        
        //animation
        $("#chatcounter").css({"font-weight": "bold"});
        setTimeout('$("#chatcounter").css({"font-weight": "normal"})', 500);
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
