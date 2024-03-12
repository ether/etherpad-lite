'use strict';
import fs from 'fs';

const check = (path:string):false|fs.Stats => {
  const existsSync = fs.statSync || fs.existsSync;

  let result:false|fs.Stats;
  try {
    result = existsSync(path);
  } catch (e) {
    result = false;
  }
  return result;
};

export default check;
