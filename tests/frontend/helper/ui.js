/**
 * the contentWindow is either the normal pad or timeslider
 *
 * @returns {HTMLElement} contentWindow
 */
helper.contentWindow = function () {
  return $('#iframe-container iframe')[0].contentWindow;
};

/**
 * Opens the chat unless it is already open via an
 * icon on the bottom right of the page
 *
 * @returns {Promise}
 */
helper.showChat = function () {
  const chaticon = helper.chatIcon();
  if (chaticon.hasClass('visible')) {
    chaticon.click();
    return helper.waitForPromise(() => !chaticon.hasClass('visible'), 2000);
  }
};

/**
 * Closes the chat window if it is shown and not sticky
 *
 * @returns {Promise}
 */
helper.hideChat = function () {
  if (helper.isChatboxShown() && !helper.isChatboxSticky()) {
    helper.titlecross().click();
    return helper.waitForPromise(() => !helper.isChatboxShown(), 2000);
  }
};

/**
 * Gets the chat icon from the bottom right of the page
 *
 * @returns {HTMLElement} the chat icon
 */
helper.chatIcon = function () { return helper.padChrome$('#chaticon'); };

/**
 * The chat messages from the UI
 *
 * @returns {Array.<HTMLElement>}
 */
helper.chatTextParagraphs = function () { return helper.padChrome$('#chattext').children('p'); };

/**
 * Returns true if the chat box is sticky
 *
 * @returns {boolean} stickyness of the chat box
 */
helper.isChatboxSticky = function () {
  return helper.padChrome$('#chatbox').hasClass('stickyChat');
};

/**
 * Returns true if the chat box is shown
 *
 * @returns {boolean} visibility of the chat box
 */
helper.isChatboxShown = function () {
  return helper.padChrome$('#chatbox').hasClass('visible');
};

/**
 * Gets the settings menu
 *
 * @returns {HTMLElement} the settings menu
 */
helper.settingsMenu = function () { return helper.padChrome$('#settings'); };

/**
 * Gets the settings button
 *
 * @returns {HTMLElement} the settings button
 */
helper.settingsButton = function () { return helper.padChrome$("button[data-l10n-id='pad.toolbar.settings.title']"); };

/**
 * Gets the titlecross icon
 *
 * @returns {HTMLElement} the titlecross icon
 */
helper.titlecross = function () { return helper.padChrome$('#titlecross'); };

/**
 * Returns true if the settings menu is visible
 *
 * @returns {boolean} is the settings menu shown?
 */
helper.isSettingsShown = function () {
  return helper.padChrome$('#settings').hasClass('popup-show');
};

/**
 * Gets the timer div of a timeslider that has the datetime of the revision
 *
 * @returns {HTMLElement} timer
 */
helper.timesliderTimer = function () {
  if (typeof helper.contentWindow().$ === 'function') {
    return helper.contentWindow().$('#timer');
  }
};

/**
 * Gets the time of the revision on a timeslider
 *
 * @returns {HTMLElement} timer
 */
helper.timesliderTimerTime = function () {
  if (helper.timesliderTimer()) {
    return helper.timesliderTimer().text();
  }
};

/**
 * The ui-slidar-bar element in the timeslider
 *
 * @returns {HTMLElement}
 */
helper.sliderBar = function () {
  return helper.contentWindow().$('#ui-slider-bar');
};

/**
 * revision_date element
 * like "Saved October 10, 2020"
 *
 * @returns {HTMLElement}
 */
helper.revisionDateElem = function () {
  return helper.contentWindow().$('#revision_date').text();
};

/**
 * revision_label element
 * like "Version 1"
 *
 * @returns {HTMLElement}
 */
helper.revisionLabelElem = function () {
  return helper.contentWindow().$('#revision_label');
};
