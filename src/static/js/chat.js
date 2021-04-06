'use strict';
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

const padutils = require('./pad_utils').padutils;
const padcookie = require('./pad_cookie').padcookie;
const Tinycon = require('tinycon/tinycon');
const hooks = require('./pluginfw/hooks');
const padeditor = require('./pad_editor').padeditor;

exports.chat = (() => {
  let isStuck = false;
  let userAndChat = false;
  let chatMentions = 0;
  return {
    show() {
      $('#chaticon').removeClass('visible');
      $('#chatbox').addClass('visible');
      this.scrollDown(true);
      chatMentions = 0;
      Tinycon.setBubble(0);
      $('.chat-gritter-msg').each(function () {
        $.gritter.remove(this.id);
      });
    },
    focus: () => {
      setTimeout(() => {
        $('#chatinput').focus();
      }, 100);
    },
    // Make chat stick to right hand side of screen
    stickToScreen(fromInitialCall) {
      if (pad.settings.hideChat) {
        return;
      }
      this.show();
      isStuck = (!isStuck || fromInitialCall);
      $('#chatbox').hide();
      // Add timeout to disable the chatbox animations
      setTimeout(() => {
        $('#chatbox, .sticky-container').toggleClass('stickyChat', isStuck);
        $('#chatbox').css('display', 'flex');
      }, 0);

      padcookie.setPref('chatAlwaysVisible', isStuck);
      $('#options-stickychat').prop('checked', isStuck);
    },
    chatAndUsers(fromInitialCall) {
      const toEnable = $('#options-chatandusers').is(':checked');
      if (toEnable || !userAndChat || fromInitialCall) {
        this.stickToScreen(true);
        $('#options-stickychat').prop('checked', true);
        $('#options-chatandusers').prop('checked', true);
        $('#options-stickychat').prop('disabled', 'disabled');
        userAndChat = true;
      } else {
        $('#options-stickychat').prop('disabled', false);
        userAndChat = false;
      }
      padcookie.setPref('chatAndUsers', userAndChat);
      $('#users, .sticky-container')
          .toggleClass('chatAndUsers popup-show stickyUsers', userAndChat);
      $('#chatbox').toggleClass('chatAndUsersChat', userAndChat);
    },
    hide() {
      // decide on hide logic based on chat window being maximized or not
      if ($('#options-stickychat').prop('checked')) {
        this.stickToScreen();
        $('#options-stickychat').prop('checked', false);
      } else {
        $('#chatcounter').text('0');
        $('#chaticon').addClass('visible');
        $('#chatbox').removeClass('visible');
      }
    },
    scrollDown(force) {
      if ($('#chatbox').hasClass('visible')) {
        if (force || !this.lastMessage || !this.lastMessage.position() ||
            this.lastMessage.position().top < ($('#chattext').outerHeight() + 20)) {
          // if we use a slow animate here we can have a race condition
          // when a users focus can not be moved away from the last message recieved.
          $('#chattext').animate(
              {scrollTop: $('#chattext')[0].scrollHeight},
              {duration: 400, queue: false});
          this.lastMessage = $('#chattext > p').eq(-1);
        }
      }
    },
    send() {
      const text = $('#chatinput').val();
      if (text.replace(/\s+/, '').length === 0) return;
      this._pad.collabClient.sendMessage({type: 'CHAT_MESSAGE', text});
      $('#chatinput').val('');
    },
    addMessage(msg, increment, isHistoryAdd) {
      // correct the time
      msg.time += this._pad.clientTimeOffset;

      // create the time string
      let minutes = `${new Date(msg.time).getMinutes()}`;
      let hours = `${new Date(msg.time).getHours()}`;
      if (minutes.length === 1) minutes = `0${minutes}`;
      if (hours.length === 1) hours = `0${hours}`;
      const timeStr = `${hours}:${minutes}`;

      // create the authorclass
      if (!msg.userId) {
        /*
         * If, for a bug or a database corruption, the message coming from the
         * server does not contain the userId field (see for example #3731),
         * let's be defensive and replace it with "unknown".
         */
        msg.userId = 'unknown';
        console.warn(
            'The "userId" field of a chat message coming from the server was not present. ' +
            'Replacing with "unknown". This may be a bug or a database corruption.');
      }

      msg.userId = padutils.escapeHtml(msg.userId);
      const authorClass = `author-${msg.userId.replace(/[^a-y0-9]/g, (c) => {
        if (c === '.') return '-';
        return `z${c.charCodeAt(0)}z`;
      })}`;

      const text = padutils.escapeHtmlWithClickableLinks(msg.text, '_blank');

      const authorName = msg.userName == null ? html10n.get('pad.userlist.unnamed')
        : padutils.escapeHtml(msg.userName);

      // the hook args
      const ctx = {
        authorName,
        author: msg.userId,
        text,
        sticky: false,
        timestamp: msg.time,
        timeStr,
        duration: 4000,
      };

      // is the users focus already in the chatbox?
      const alreadyFocused = $('#chatinput').is(':focus');

      // does the user already have the chatbox open?
      const chatOpen = $('#chatbox').hasClass('visible');

      // does this message contain this user's name? (is the curretn user mentioned?)
      const myName = $('#myusernameedit').val();
      const wasMentioned =
          text.toLowerCase().indexOf(myName.toLowerCase()) !== -1 && myName !== 'undefined';

      // If the user was mentioned, make the message sticky
      if (wasMentioned && !alreadyFocused && !isHistoryAdd && !chatOpen) {
        chatMentions++;
        Tinycon.setBubble(chatMentions);
        ctx.sticky = true;
      }

      // Call chat message hook
      hooks.aCallAll('chatNewMessage', ctx, () => {
        const html =
            `<p data-authorId='${msg.userId}' class='${authorClass}'><b>${authorName}:</b>` +
            `<span class='time ${authorClass}'>${ctx.timeStr}</span> ${ctx.text}</p>`;
        if (isHistoryAdd) $(html).insertAfter('#chatloadmessagesbutton');
        else $('#chattext').append(html);

        // should we increment the counter??
        if (increment && !isHistoryAdd) {
          // Update the counter of unread messages
          let count = Number($('#chatcounter').text());
          count++;
          $('#chatcounter').text(count);

          if (!chatOpen && ctx.duration > 0) {
            $.gritter.add({
              // Note: ctx.authorName and ctx.text are already HTML-escaped.
              text: $('<p>')
                  .append($('<span>').addClass('author-name').html(ctx.authorName))
                  .append(ctx.text),
              sticky: ctx.sticky,
              time: 5000,
              position: 'bottom',
              class_name: 'chat-gritter-msg',
            });
          }
        }
      });

      // Clear the chat mentions when the user clicks on the chat input box
      $('#chatinput').click(() => {
        chatMentions = 0;
        Tinycon.setBubble(0);
      });
      if (!isHistoryAdd) this.scrollDown();
    },
    init(pad) {
      this._pad = pad;
      $('#chatinput').on('keydown', (evt) => {
        // If the event is Alt C or Escape & we're already in the chat menu
        // Send the users focus back to the pad
        if ((evt.altKey === true && evt.which === 67) || evt.which === 27) {
          // If we're in chat already..
          $(':focus').blur(); // required to do not try to remove!
          padeditor.ace.focus(); // Sends focus back to pad
          evt.preventDefault();
          return false;
        }
      });

      const self = this;
      $('body:not(#chatinput)').on('keypress', function (evt) {
        if (evt.altKey && evt.which === 67) {
          // Alt c focuses on the Chat window
          $(this).blur();
          self.show();
          $('#chatinput').focus();
          evt.preventDefault();
        }
      });

      $('#chatinput').keypress((evt) => {
        // if the user typed enter, fire the send
        if (evt.which === 13 || evt.which === 10) {
          evt.preventDefault();
          this.send();
        }
      });

      // initial messages are loaded in pad.js' _afterHandshake

      $('#chatcounter').text(0);
      $('#chatloadmessagesbutton').click(() => {
        const start = Math.max(this.historyPointer - 20, 0);
        const end = this.historyPointer;

        if (start === end) return; // nothing to load

        $('#chatloadmessagesbutton').css('display', 'none');
        $('#chatloadmessagesball').css('display', 'block');

        pad.collabClient.sendMessage({type: 'GET_CHAT_MESSAGES', start, end});
        this.historyPointer = start;
      });
    },
  };
})();
