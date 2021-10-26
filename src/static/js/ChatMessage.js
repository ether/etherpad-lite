'use strict';

/**
 * Represents a chat message stored in the database and transmitted among users. Plugins can extend
 * the object with additional properties.
 *
 * Supports serialization to JSON.
 */
class ChatMessage {
  static fromObject(obj) {
    return Object.assign(new ChatMessage(), obj);
  }

  /**
   * @param {?string} [text] - Initial value of the `text` property.
   * @param {?string} [userId] - Initial value of the `userId` property.
   * @param {?number} [time] - Initial value of the `time` property.
   */
  constructor(text = null, userId = null, time = null) {
    /**
     * The raw text of the user's chat message (before any rendering or processing).
     *
     * @type {?string}
     */
    this.text = text;

    /**
     * The user's author ID.
     *
     * @type {?string}
     */
    this.userId = userId;

    /**
     * The message's timestamp, as milliseconds since epoch.
     *
     * @type {?number}
     */
    this.time = time;

    /**
     * The user's display name.
     *
     * @type {?string}
     */
    this.userName = null;
  }
}

module.exports = ChatMessage;
