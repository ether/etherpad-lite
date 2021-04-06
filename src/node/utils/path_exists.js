'use strict';
const fs = require('fs');

const check = (path) => {
  const existsSync = fs.statSync || fs.existsSync || path.existsSync;

  let result;
  try {
    result = existsSync(path);
  } catch (e) {
    result = false;
  }
  return result;
};

module.exports = check;
