'use strict';

// As of v14, Node.js does not exit when there is an unhandled Promise rejection. Convert an
// unhandled rejection into an uncaught exception, which does cause Node.js to exit.
process.on('unhandledRejection', (err) => { throw err; });

const util = require('util');

const startTime = Date.now();

const log = (str) => {
  console.log(`${(Date.now() - startTime) / 1000}\t${str}`);
};

const unescape = (val) => {
  // value is a string
  if (val.substr(0, 1) === "'") {
    val = val.substr(0, val.length - 1).substr(1);

    return val.replace(/\\[0nrbtZ\\'"]/g, (s) => {
      switch (s) {
        case '\\0': return '\0';
        case '\\n': return '\n';
        case '\\r': return '\r';
        case '\\b': return '\b';
        case '\\t': return '\t';
        case '\\Z': return '\x1a';
        default: return s.substr(1);
      }
    });
  }

  // value is a boolean or NULL
  if (val === 'NULL') {
    return null;
  }
  if (val === 'true') {
    return true;
  }
  if (val === 'false') {
    return false;
  }

  // value is a number
  return val;
};

(async () => {
  const fs = require('fs');
  const log4js = require('log4js');
  const readline = require('readline');
  const settings = require('../node/utils/Settings');
  const ueberDB = require('ueberdb2');

  const dbWrapperSettings = {
    cache: 0,
    writeInterval: 100,
    json: false, // data is already json encoded
  };
  const db = new ueberDB.database( // eslint-disable-line new-cap
      settings.dbType,
      settings.dbSettings,
      dbWrapperSettings,
      log4js.getLogger('ueberDB'));

  const sqlFile = process.argv[2];

  // stop if the settings file is not set
  if (!sqlFile) throw new Error('Use: node importSqlFile.js $SQLFILE');

  log('initializing db');
  await util.promisify(db.init.bind(db))();
  log('done');

  log(`Opening ${sqlFile}...`);
  const stream = fs.createReadStream(sqlFile, {encoding: 'utf8'});

  log(`Reading ${sqlFile}...`);
  let keyNo = 0;
  for await (const l of readline.createInterface({input: stream, crlfDelay: Infinity})) {
    if (l.substr(0, 27) === 'REPLACE INTO store VALUES (') {
      const pos = l.indexOf("', '");
      const key = l.substr(28, pos - 28);
      let value = l.substr(pos + 3);
      value = value.substr(0, value.length - 2);
      console.log(`key: ${key} val: ${value}`);
      console.log(`unval: ${unescape(value)}`);
      db.set(key, unescape(value), null);
      keyNo++;
      if (keyNo % 1000 === 0) log(` ${keyNo}`);
    }
  }
  process.stdout.write('\n');
  process.stdout.write('done. waiting for db to finish transaction. ' +
                       'depended on dbms this may take some time..\n');

  await util.promisify(db.close.bind(db))();
  log(`finished, imported ${keyNo} keys.`);
})();
