'use strict';

const {padutils: {warnDeprecated}} = require('./pad_utils');

/**
 * Represents a chat message stored in the database and transmitted among users. Plugins can extend
 * the object with additional properties.
 *
 * Supports serialization to JSON.
 */
class ChatMessage {
  static fromObject(obj) {
    // The userId property was renamed to authorId, and userName was renamed to displayName. Accept
    // the old names in case the db record was written by an older version of Etherpad.
    obj = Object.assign({}, obj); // Don't mutate the caller's object.
    if ('userId' in obj && !('authorId' in obj)) obj.authorId = obj.userId;
    delete obj.userId;
    if ('userName' in obj && !('displayName' in obj)) obj.displayName = obj.userName;
    delete obj.userName;
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
  get userId() {
    warnDeprecated('ChatMessage.userId property is deprecated; use .authorId instead');
    return this.authorId;
  }
  set userId(val) {
    warnDeprecated('ChatMessage.userId property is deprecated; use .authorId instead');
    this.authorId = val;
  }

  /**
   * Alias of `displayName`, for compatibility with old plugins.
   *
   * @deprecated Use `displayName` instead.
   * @type {string}
   */
  get userName() {
    warnDeprecated('ChatMessage.userName property is deprecated; use .displayName instead');
    return this.displayName;
  }
  set userName(val) {
    warnDeprecated('ChatMessage.userName property is deprecated; use .displayName instead');
    this.displayName = val;
  }

  // TODO: Delete this method once users are unlikely to roll back to a version of Etherpad that
  // doesn't support authorId and displayName.
  toJSON() {
    const {authorId, displayName, ...obj} = this;
    obj.userId = authorId;
    obj.userName = displayName;
    return obj;
  }
}

module.exports = ChatMessage;
