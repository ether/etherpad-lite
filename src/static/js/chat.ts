import ChatMessage from "./ChatMessage.js";
import { padutils as padutils$0 } from "./pad_utils.js";
import { padcookie as padcookie$0 } from "./pad_cookie.js";
import Tinycon from "tinycon/tinycon";
import * as hooks from "./pluginfw/hooks.js";
import { padeditor as padeditor$0 } from "./pad_editor.js";
import {CustomWindow, JQueryGritter} from "../module/CustomWindow";
import {pad} from "./pad";
import {i18nextvar} from "./vendors/i18next";
'use strict';
const padutils = { padutils: padutils$0 }.padutils;
const padcookie = { padcookie: padcookie$0 }.padcookie;
const padeditor = { padeditor: padeditor$0 }.padeditor;
// Removes diacritics and lower-cases letters. https://stackoverflow.com/a/37511463
const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const chat = (() => {
    let isStuck = false;
    let userAndChat = false;
    let chatMentions = 0;
    return {
        historyPointer: undefined, gotInitalMessages: false,

        show() {
            $('#chaticon').removeClass('visible');
            $('#chatbox').addClass('visible');
            this.scrollDown(true);
            chatMentions = 0;
            Tinycon.setBubble(0);
            $('.chat-gritter-msg').each(function () {
                ($ as unknown as JQueryGritter).gritter.remove(this.id);
            });
        },
        focus: () => {
            setTimeout(() => {
                $('#chatinput').focus();
            }, 100);
        },
        // Make chat stick to right hand side of screen
        stickToScreen(fromInitialCall?) {
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
        chatAndUsers(fromInitialCall?) {
            const toEnable = $('#options-chatandusers').is(':checked');
            if (toEnable || !userAndChat || fromInitialCall) {
                this.stickToScreen(true);
                $('#options-stickychat').prop('checked', true);
                $('#options-chatandusers').prop('checked', true);
                $('#options-stickychat').prop('disabled', 'disabled');
                userAndChat = true;
            }
            else {
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
            }
            else {
                $('#chatcounter').text('0');
                $('#chaticon').addClass('visible');
                $('#chatbox').removeClass('visible');
            }
        },
        scrollDown(force?) {
            if ($('#chatbox').hasClass('visible')) {
                if (force || !this.lastMessage || !this.lastMessage.position() ||
                    this.lastMessage.position().top < ($('#chattext').outerHeight() + 20)) {
                    // if we use a slow animate here we can have a race condition
                    // when a users focus can not be moved away from the last message recieved.
                    $('#chattext').animate({ scrollTop: $('#chattext')[0].scrollHeight }, { duration: 400, queue: false });
                    this.lastMessage = $('#chattext > p').eq(-1);
                }
            }
        },
        async send() {
            const text = $('#chatinput').val();
            if (typeof text !== "string" || text?.replace(/\s+/, '').length === 0)
                return;
            const message = new ChatMessage(text);
            await hooks.aCallAll('chatSendMessage', Object.freeze({ message }));
            this._pad.collabClient.sendMessage({ type: 'CHAT_MESSAGE', message });
            $('#chatinput').val('');
        },
        async addMessage(msg, increment, isHistoryAdd) {
            msg = ChatMessage.fromObject(msg);
            // correct the time
            msg.time += this._pad.clientTimeOffset;
            if (!msg.authorId) {
                /*
                 * If, for a bug or a database corruption, the message coming from the
                 * server does not contain the authorId field (see for example #3731),
                 * let's be defensive and replace it with "unknown".
                 */
                msg.authorId = 'unknown';
                console.warn('The "authorId" field of a chat message coming from the server was not present. ' +
                    'Replacing with "unknown". This may be a bug or a database corruption.');
            }
            const authorClass = (authorId) => `author-${authorId.replace(/[^a-y0-9]/g, (c) => {
                if (c === '.')
                    return '-';
                return `z${c.charCodeAt(0)}z`;
            })}`;
            // the hook args
            const ctx = {
                authorName: msg.displayName != null ? msg.displayName : i18nextvar('pad.userlist.unnamed'),
                author: msg.authorId,
                text: padutils.escapeHtmlWithClickableLinks(msg.text, '_blank'),
                message: msg,
                rendered: null,
                sticky: false,
                timestamp: msg.time,
                timeStr: (() => {
                    let minutes = `${new Date(msg.time).getMinutes()}`;
                    let hours = `${new Date(msg.time).getHours()}`;
                    if (minutes.length === 1)
                        minutes = `0${minutes}`;
                    if (hours.length === 1)
                        hours = `0${hours}`;
                    return `${hours}:${minutes}`;
                })(),
                duration: 4000,
            };
            // is the users focus already in the chatbox?
            const alreadyFocused = $('#chatinput').is(':focus');
            // does the user already have the chatbox open?
            const chatOpen = $('#chatbox').hasClass('visible');
            // does this message contain this user's name? (is the current user mentioned?)
            const wasMentioned = msg.authorId !== (window as unknown as CustomWindow).clientVars.userId &&
                ctx.authorName !== i18nextvar('pad.userlist.unnamed') &&
                normalize(ctx.text).includes(normalize(ctx.authorName));
            // If the user was mentioned, make the message sticky
            if (wasMentioned && !alreadyFocused && !isHistoryAdd && !chatOpen) {
                chatMentions++;
                Tinycon.setBubble(chatMentions);
                ctx.sticky = true;
            }
            await hooks.aCallAll('chatNewMessage', ctx);
            const cls = authorClass(ctx.author);
            const chatMsg = ctx.rendered != null ? $(ctx.rendered) : $('<p>')
                .attr('data-authorId', ctx.author)
                .addClass(cls)
                .append($('<b>').text(`${ctx.authorName}:`))
                .append($('<span>')
                .addClass('time')
                .addClass(cls)
                // Hook functions are trusted to not introduce an XSS vulnerability by adding
                // unescaped user input to ctx.timeStr.
                .html(ctx.timeStr))
                .append(' ')
                // ctx.text was HTML-escaped before calling the hook. Hook functions are trusted to not
                // introduce an XSS vulnerability by adding unescaped user input.
                .append($('<div>').html(ctx.text).contents());
            if (isHistoryAdd)
                chatMsg.insertAfter('#chatloadmessagesbutton');
            else
                $('#chattext').append(chatMsg);
            chatMsg.each((i, e) => {
                //TODO Fix this and return the component
                i18nextvar(e)
            });
            // should we increment the counter??
            if (increment && !isHistoryAdd) {
                // Update the counter of unread messages
                let count = Number($('#chatcounter').text());
                count++;
                $('#chatcounter').text(count);
                if (!chatOpen && ctx.duration > 0) {
                    const text = $('<p>')
                        .append($('<span>').addClass('author-name').text(ctx.authorName))
                        // ctx.text was HTML-escaped before calling the hook. Hook functions are trusted
                        // to not introduce an XSS vulnerability by adding unescaped user input.
                        .append($('<div>').html(ctx.text).contents());
                    text.each((i, e) =>  {
                        //TODO Fix this and return the component
                        i18nextvar(e.getAttribute('data-l10n-id'))
                    });;
                    ($ as unknown as JQueryGritter).gritter.add({
                        text,
                        sticky: ctx.sticky,
                        time: ctx.duration,
                        position: 'bottom',
                        class_name: 'chat-gritter-msg',
                    });
                }
            }
            if (!isHistoryAdd)
                this.scrollDown();
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
            // Clear the chat mentions when the user clicks on the chat input box
            $('#chatinput').click(() => {
                chatMentions = 0;
                Tinycon.setBubble(0);
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
                if (evt.key === 'Enter' && !evt.shiftKey) {
                    evt.preventDefault();
                    this.send();
                }
            });
            // initial messages are loaded in pad.js' _afterHandshake
            $('#chatcounter').text(0);
            $('#chatloadmessagesbutton').click(() => {
                const start = Math.max(this.historyPointer - 20, 0);
                const end = this.historyPointer;
                if (start === end)
                    return; // nothing to load
                $('#chatloadmessagesbutton').css('display', 'none');
                $('#chatloadmessagesball').css('display', 'block');
                pad.collabClient.sendMessage({ type: 'GET_CHAT_MESSAGES', start, end });
                this.historyPointer = start;
            });
        },
    };
})();
