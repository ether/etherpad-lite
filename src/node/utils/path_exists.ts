'use strict';
import fs from 'fs';

export const check = (path) => {
  const existsSync = fs.statSync || fs.existsSync || path.existsSync;

  let result;
  try {
    result = existsSync(path);
  } catch (e) {
    result = false;
  }
  return result;
}
