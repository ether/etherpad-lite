'use strict';

const ChatMessage = require('../static/js/ChatMessage');
const api = require('./db/API');
const authorManager = require('./db/AuthorManager');
const hooks = require('../static/js/pluginfw/hooks.js');
const pad = require('./db/Pad');
const padManager = require('./db/PadManager');
const padMessageHandler = require('./handler/PadMessageHandler');

let socketio;

const appendChatMessage = async (pad, msg) => {
  pad.chatHead++;
  await Promise.all([
    // Don't save the display name in the database because the user can change it at any time. The
    // `displayName` property will be populated with the current value when the message is read from
    // the database.
    pad.db.set(`pad:${pad.id}:chat:${pad.chatHead}`, {...msg, displayName: undefined}),
    pad.saveToDatabase(),
  ]);
};

const getChatMessage = async (pad, entryNum) => {
  const entry = await pad.db.get(`pad:${pad.id}:chat:${entryNum}`);
  if (entry == null) return null;
  const message = ChatMessage.fromObject(entry);
  message.displayName = await authorManager.getAuthorName(message.authorId);
  return message;
};

const getChatMessages = async (pad, start, end) => {
  const entries = await Promise.all(
      [...Array(end + 1 - start).keys()].map((i) => getChatMessage(pad, start + i)));

  // sort out broken chat entries
  // it looks like in happened in the past that the chat head was
  // incremented, but the chat message wasn't added
  return entries.filter((entry) => {
    const pass = (entry != null);
    if (!pass) {
      console.warn(`WARNING: Found broken chat entry in pad ${pad.id}`);
    }
    return pass;
  });
};

const sendChatMessageToPadClients = async (message, padId) => {
  const pad = await padManager.getPad(padId, null, message.authorId);
  await hooks.aCallAll('chatNewMessage', {message, pad, padId});
  // appendChatMessage() ignores the displayName property so we don't need to wait for
  // authorManager.getAuthorName() to resolve before saving the message to the database.
  const promise = appendChatMessage(pad, message);
  message.displayName = await authorManager.getAuthorName(message.authorId);
  socketio.sockets.in(padId).json.send({
    type: 'COLLABROOM',
    data: {type: 'CHAT_MESSAGE', message},
  });
  await promise;
};

exports.clientVars = (hookName, {pad: {chatHead}}) => ({chatHead});

exports.eejsBlock_mySettings = (hookName, context) => {
  context.content += `
    <p class="hide-for-mobile">
      <input type="checkbox" id="options-stickychat">
      <label for="options-stickychat" data-l10n-id="pad.settings.stickychat"></label>
    </p>
    <p class="hide-for-mobile">
      <input type="checkbox" id="options-chatandusers">
      <label for="options-chatandusers" data-l10n-id="pad.settings.chatandusers"></label>
    </p>
  `;
};

exports.eejsBlock_stickyContainer = (hookName, context) => {
  /* eslint-disable max-len */
  context.content += `
    <div id="chaticon" class="visible" title="Chat (Alt C)">
      <span id="chatlabel" data-l10n-id="pad.chat"></span>
      <span class="buttonicon buttonicon-chat"></span>
      <span id="chatcounter">0</span>
    </div>
    <div id="chatbox">
      <div class="chat-content">
        <div id="titlebar">
          <h1 id ="titlelabel" data-l10n-id="pad.chat"></h1>
          <a id="titlecross" class="hide-reduce-btn">-&nbsp;</a>
          <a id="titlesticky" class="stick-to-screen-btn" data-l10n-id="pad.chat.stick.title">█&nbsp;&nbsp;</a>
        </div>
        <div id="chattext" class="thin-scrollbar" aria-live="polite" aria-relevant="additions removals text" role="log" aria-atomic="false">
          <div alt="loading.." id="chatloadmessagesball" class="chatloadmessages loadingAnimation" align="top"></div>
          <button id="chatloadmessagesbutton" class="chatloadmessages" data-l10n-id="pad.chat.loadmessages"></button>
        </div>
        <div id="chatinputbox">
          <form>
            <textarea id="chatinput" maxlength="999" data-l10n-id="pad.chat.writeMessage.placeholder"></textarea>
          </form>
        </div>
      </div>
    </div>
  `;
  /* eslint-enable max-len */
};

exports.handleMessage = async (hookName, {message, sessionInfo, socket}) => {
  const {authorId, padId, readOnly} = sessionInfo;
  if (message.type !== 'COLLABROOM' || readOnly) return;
  switch (message.data.type) {
    case 'CHAT_MESSAGE': {
      const chatMessage = ChatMessage.fromObject(message.data.message);
      // Don't trust the user-supplied values.
      chatMessage.time = Date.now();
      chatMessage.authorId = authorId;
      await sendChatMessageToPadClients(chatMessage, padId);
      break;
    }
    case 'GET_CHAT_MESSAGES': {
      const {start, end} = message.data;
      if (!Number.isInteger(start)) throw new Error(`missing or invalid start: ${start}`);
      if (!Number.isInteger(end)) throw new Error(`missing or invalid end: ${end}`);
      const count = end - start;
      if (count < 0 || count > 100) throw new Error(`invalid number of messages: ${count}`);
      const pad = await padManager.getPad(padId, null, authorId);
      socket.json.send({
        type: 'COLLABROOM',
        data: {
          type: 'CHAT_MESSAGES',
          messages: await getChatMessages(pad, start, end),
        },
      });
      break;
    }
    default:
      return;
  }
  return null; // Important! Returning null (not undefined!) stops further processing.
};

exports.socketio = (hookName, {io}) => {
  socketio = io;
};

api.registerChatHandlers({
  getChatMessages,
  sendChatMessageToPadClients,
});

pad.registerLegacyChatMethodHandlers({
  appendChatMessage,
  getChatMessage,
  getChatMessages,
});

padMessageHandler.registerLegacyChatHandlers({
  sendChatMessageToPadClients,
});
