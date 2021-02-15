'use strict';
// support for older node versions (<12)
const assert = require('assert');

const internalMatch = (string, regexp, message, fn) => {
  if (!regexp.test) {
    throw new Error('regexp parameter is not a RegExp');
  }
  if (typeof string !== 'string') {
    throw new Error('string parameter is not a string');
  }
  const match = fn.name === 'match';

  const result = string.match(regexp);
  if (match && !result) {
    if (message) {
      throw message;
    } else {
      throw new Error(`${string} does not match regex ${regexp}`);
    }
  }
  if (!match && result) {
    if (message) {
      throw message;
    } else {
      throw new Error(`${string} does match regex ${regexp}`);
    }
  }
};


if (!assert.match) {
  const match = (string, regexp, message) => {
    internalMatch(string, regexp, message, match);
  };
  assert.match = match;
}
if (!assert.strict.match) assert.strict.match = assert.match;

if (!assert.doesNotMatch) {
  const doesNotMatch = (string, regexp, message) => {
    internalMatch(string, regexp, message, doesNotMatch);
  };
  assert.doesNotMatch = doesNotMatch;
}
if (!assert.strict.doesNotMatch) assert.strict.doesNotMatch = assert.doesNotMatch;

module.exports = assert;
