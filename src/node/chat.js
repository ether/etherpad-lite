'use strict';

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
