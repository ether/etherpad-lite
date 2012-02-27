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

var padutils  = require('/pad_utils').padutils,
    padcookie = require('/pad_cookie').padcookie;

var chat = (function() {
  var isStuck       = false,
      chatMentions  = 0,
      title         = document.title;
  var self = {
    show: function()  {
      $('#chaticon').hide();
      $('#chatbox').show();
      self.scrollDown();
      chatMentions = 0;
      document.title = title;
    },
    stickToScreen: function(fromInitialCall) {  // make chat stick to right hand side of screen
      chat.show();
      if (!isStuck || fromInitialCall) { // do stick it
        padcookie.setPref('chatAlwaysVisible', true);
        $('BODY').addClass('chat-visible');
        isStuck = true;
      } else { // unstick it
        padcookie.setPref('chatAlwaysVisible', false);
        $('BODY').removeClass('chat-visible');
        isStuck = false;
      }
    },
    hide: function() {
      $('#chatcounter').text('0');
      $('#chaticon').show();
      $('#chatbox').hide();
    },
    scrollDown: function() {
      if ($('#chatbox').is(':visible'))
        $('#chattext').animate({scrollTop: $('#chattext')[0].scrollHeight}, 600);
    }, 
    send: function() {
      var text = $('#chatinput').val();
      this._pad.collabClient.sendMessage({
        'type': 'CHAT_MESSAGE',
        'text': text
      });
      $('#chatinput').val('');
    },
    addMessage: function(msg, increment) {
      // correct the time
      msg.time += this._pad.clientTimeOffset;
      
      // create the time string
      var minutes = '' + new Date(msg.time).getMinutes(),
          hours   = '' + new Date(msg.time).getHours(),
          timeStr;
      if (minutes.length == 1)
        minutes = '0' + minutes;
      if (hours.length == 1)
        hours = '0' + hours;
      timeStr = hours + ':' + minutes;
        
      // create the authorclass
      var authorClass = 'author-' + msg.userId.replace(/[^a-y0-9]/g, function(c) {
        if (c == '.')
          return '-';
        return 'z' + c.charCodeAt(0) + 'z';
      });

      var text = padutils.escapeHtmlWithClickableLinks(padutils.escapeHtml(msg.text), '_blank');

      // do something when your name is mentioned
      var myName        = $('#myusernameedit').val().toLowerCase(),
          chatText      = text.toLowerCase(),
          wasMentioned  = false;
      if (chatText.indexOf(myName) !== -1 && myName != 'undefined')
        wasMentioned = true;
      // end of action

      var authorName  = msg.userName == null ? 'unnamed' : padutils.escapeHtml(msg.userName),
          html        = '<p class="' + authorClass + '"><strong>' + authorName + ':</strong><span class="time ' + authorClass + '">' + timeStr + '</span>' + text + '</p>';
      $('#chattext').append(html);
      
      // should we increment the counter??
      if (increment) {
        var count = Number($('#chatcounter').text());
        count++;
        $('#chatcounter').text(count);
        // chat throb stuff -- Just make it throw for twice as long
        if (wasMentioned) { // If the user was mentioned, show twice as long and flash the browser window
          if (chatMentions == 0)
            title = document.title;
          $('#chatthrob').html('<b>' + authorName + '</b>' + ': ' + text).show().delay(4000).hide(400);
          chatMentions++;
          document.title = '(' + chatMentions + ') ' + title;
        } else {
          $('#chatthrob').html('<b>' + authorName + '</b>' + ': ' + text).show().delay(2000).hide(400);
        }
      }
      self.scrollDown();
    },
    init: function(pad) {
      this._pad = pad;
      $('#chatinput').keypress(function(evt) {
        if (evt.which == 13) {  // send on enter
          evt.preventDefault();
          self.send();
        }
      });
      for (var i in clientVars.chatHistory) {
        this.addMessage(clientVars.chatHistory[i], false);
      }
      $('#chatcounter').text(clientVars.chatHistory.length);
    }
  };

  return self;
}());

exports.chat = chat;