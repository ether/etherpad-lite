/**
 * Spys on socket.io messages and saves them into several arrays
 * that are visible in tests
 */
helper.spyOnSocketIO = function (){
  helper.contentWindow().pad.socket.on('message', function(msg){
    if (msg.type == "COLLABROOM") {

      if (msg.data.type == 'ACCEPT_COMMIT') {
        helper.commits.push(msg);
      }
      else if (msg.data.type == 'USER_NEWINFO') {
        helper.userInfos.push(msg)
      }
      else if (msg.data.type == 'CHAT_MESSAGE') {
        helper.chatMessages.push(msg)
      }
    }
  })
}

/**
 * Makes an edit via `sendkeys` to the position of the caret and ensures ACCEPT_COMMIT
 * is returned by the server
 * It does not check if the ACCEPT_COMMIT is the edit sent, though
 * If `line` is not given, the edit goes to line no. 1
 *
 * @param {string} message The edit to make - can be anything supported by `sendkeys`
 * @param {number} [line] the optional line to make the edit on starting from 1
 * @returns {Promise}
 * @todo needs to support writing to a specified position
 *
 */
helper.edit = async function(message, line){
  let editsNr = helper.commits.length;
  line = line ? line - 1 : 0;
  helper.linesDiv()[line].sendkeys(message);
  return helper.waitForPromise(function(){
    return editsNr + 1 === helper.commits.length;
  })
}

/**
 * The pad text as an array of divs
 *
 * @example
 * helper.linesDiv()[2].sendkeys('abc') // sends abc to the third line
 *
 * @returns {Array.<HTMLElement>} array of divs
 */
helper.linesDiv = function(){
  return helper.padInner$('.ace-line').map(function(){
    return $(this)
  })
}

/**
 * The pad text as an array of lines
 *
 * @returns {Array.<string>} lines of text
 */
helper.textLines = function(){
  return helper.padInner$('.ace-line').map(function(){
    return $(this).text()
  }).get()
}

/**
 * The default pad text transmitted via `clientVars`
 *
 * @returns {string}
 */
helper.defaultText = function(){
  return helper.padChrome$.window.clientVars.collab_client_vars.initialAttributedText.text;
}

/**
 * Sends a chat `message` via `sendKeys`
 *
 * @param {string} message the chat message to be sent
 * @returns {Promise}
 */
helper.sendChatMessage = function(message){
  let noOfChatMessages = helper.chatMessages.length;
  helper.padChrome$("#chatinput").sendkeys(message)
  return helper.waitForPromise(function(){
    return noOfChatMessages + 1 === helper.chatMessages.length;
  })
}

/**
 * Opens the settings menu if its hidden via button
 *
 * @returns {Promise}
 */
helper.showSettings = function() {
  if(!helper.isSettingsShown()){
    helper.settingsButton().click()
    return helper.waitForPromise(function(){return helper.isSettingsShown(); },2000);
  }
}

/**
 * Hide the settings menu if its open via button
 *
 * @returns {Promise}
 * @todo untested
 */
helper.hideSettings = function() {
  if(helper.isSettingsShown()){
    helper.settingsButton().click()
    return helper.waitForPromise(function(){return !helper.isSettingsShown(); },2000);
  }
}

/**
 * Makes the chat window sticky via settings menu if the settings menu is
 * open and sticky button is not checked
 *
 * @returns {Promise}
 */
helper.enableStickyChatviaSettings = function() {
  var stickyChat = helper.padChrome$('#options-stickychat');
  if(helper.isSettingsShown() && !stickyChat.is(':checked')) {
    stickyChat.click();
    return helper.waitForPromise(function(){
      return helper.isChatboxSticky();
    },2000);
  }
}

/**
 * Unsticks the chat window via settings menu if the settings menu is open
 * and sticky button is checked
 *
 * @returns {Promise}
 */
helper.disableStickyChatviaSettings = function() {
  var stickyChat = helper.padChrome$('#options-stickychat');
  if(helper.isSettingsShown() && stickyChat.is(':checked')) {
    stickyChat.click();
    return helper.waitForPromise(function(){return !helper.isChatboxSticky()},2000);
  }
}

/**
 * Makes the chat window sticky via an icon on the top right of the chat
 * window
 *
 * @returns {Promise}
 */
helper.enableStickyChatviaIcon = function() {
  var stickyChat = helper.padChrome$('#titlesticky');
  if(helper.isChatboxShown() && !helper.isChatboxSticky()) {
    stickyChat.click();
    return helper.waitForPromise(function(){return helper.isChatboxSticky()},2000);
  }
}

/**
 * Disables the stickyness of the chat window via an icon on the
 * upper right
 *
 * @returns {Promise}
 */
helper.disableStickyChatviaIcon = function() {
  if(helper.isChatboxShown() && helper.isChatboxSticky()) {
    helper.titlecross().click()
    return helper.waitForPromise(function(){return !helper.isChatboxSticky()},2000);
  }
}

/**
 * Sets the src-attribute of the main iframe to the timeslider
 * In case a revision is given, sets the timeslider to this specific revision.
 * Defaults to going to the last revision.
 * It waits until the timer is filled with date and time, because it's one of the
 * last things that happen during timeslider load
 *
 * @param {number} [revision] the optional revision
 * @returns {Promise}
 * @todo for some reason this does only work the first time, you cannot
 * goto rev 0 and then via the same method to rev 5. Use buttons instead
 */
helper.gotoTimeslider = function(revision){
  revision = Number.isInteger(revision) ? '#'+revision : '';
  var iframe = $('#iframe-container iframe');
  iframe.attr('src', iframe.attr('src')+'/timeslider' + revision);

  return helper.waitForPromise(function(){
    return helper.timesliderTimerTime()
      && !Number.isNaN(new Date(helper.timesliderTimerTime()).getTime()) },5000);
}

/**
 * Clicks in the timeslider at a specific offset
 * It's used to navigate the timeslider
 *
 * @todo no mousemove test
 * @param {number} X coordinate
 */
helper.sliderClick = function(X){
  let sliderBar = helper.sliderBar()
  let edown = new jQuery.Event('mousedown');
  let eup = new jQuery.Event('mouseup');
  edown.clientX = eup.clientX = X;
  edown.clientY = eup.clientY = sliderBar.offset().top;

  sliderBar.trigger(edown);
  sliderBar.trigger(eup);
}

/**
 * The timeslider text as an array of lines
 *
 * @returns {Array.<string>} lines of text
 */
helper.timesliderTextLines = function(){
  return helper.contentWindow().$('.ace-line').map(function(){
    return $(this).text()
  }).get()
}
