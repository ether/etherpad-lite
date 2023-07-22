'use strict';
import fs from "fs";

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

export default check;