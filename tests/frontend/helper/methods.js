/*
 * chat messages received
 * @type {Array}
 */
helper.chatMessages = [];

/*
 * changeset commits from the server
 * @type {Array}
 */
helper.commits = [];

/*
 * userInfo messages from the server
 * @type {Array}
 */
helper.userInfos = [];

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
