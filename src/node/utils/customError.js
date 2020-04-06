/**
 * CustomError
 *
 * This helper modules allows us to create different type of errors we can throw
 *
 * @class CustomError
 * @extends {Error}
 */
class CustomError extends Error {
  /**
   * Creates an instance of CustomError.
   * @param {*} message
   * @param {string} [name='Error'] a custom name for the error object
   * @memberof CustomError
   */
  constructor(message, name = 'Error') {
    super(message);
    this.name = name;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = CustomError;
