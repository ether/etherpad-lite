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
   * @param {?string} [authorId] - Initial value of the `authorId` property.
   * @param {?number} [time] - Initial value of the `time` property.
   */
  constructor(text = null, authorId = null, time = null) {
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
    this.authorId = authorId;

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
    this.displayName = null;
  }

  /**
   * Alias of `authorId`, for compatibility with old plugins.
   *
   * @deprecated Use `authorId` instead.
   * @type {string}
   */
  get userId() { return this.authorId; }
  set userId(val) { this.authorId = val; }

  /**
   * Alias of `displayName`, for compatibility with old plugins.
   *
   * @deprecated Use `displayName` instead.
   * @type {string}
   */
  get userName() { return this.displayName; }
  set userName(val) { this.displayName = val; }

  // TODO: Delete this method once users are unlikely to roll back to a version of Etherpad that
  // doesn't support authorId and displayName.
  toJSON() {
    return {
      ...this,
      authorId: undefined,
      displayName: undefined,
      userId: this.authorId,
      userName: this.displayName,
    };
  }
}

module.exports = ChatMessage;
