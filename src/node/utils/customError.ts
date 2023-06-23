'use strict';
/**
 * CustomError
 *
 * This helper modules allows us to create different type of errors we can throw
 *
 * @class CustomError
 * @extends {Error}
 */
export class CustomError extends Error {
  code: any;
  signal: any;
  easysync: boolean
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
