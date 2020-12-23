/* eslint max-len: 0 */
// Allowing eslint to ignore SQL Statements
'use strict';

const startTime = Date.now();
const fs = require('fs');
const mysql = require(`${__dirname}/../src/node_modules/ueberdb2/node_modules/mysql`);
const async = require(`${__dirname}/../src/node_modules/async`);
const Changeset = require('ep_etherpad-lite/static/js/Changeset');
const randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;
const AttributePool = require('ep_etherpad-lite/static/js/AttributePool');

const settingsFile = process.argv[2];
const sqlOutputFile = process.argv[3];

// stop if the settings file is not set
if (!settingsFile || !sqlOutputFile) {
  console.error('Use: node convert.js $SETTINGSFILE $SQLOUTPUT');
  throw new Error();
}

log('read settings file...');
// read the settings file and parse the json
const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
log('done');

log('open output file...');
const sqlOutput = fs.openSync(sqlOutputFile, 'w');
const sql = 'SET CHARACTER SET UTF8;\n' +
          'CREATE TABLE IF NOT EXISTS `store` ( \n' +
          '`key` VARCHAR( 100 ) NOT NULL , \n' +
          '`value` LONGTEXT NOT NULL , \n' +
          'PRIMARY KEY (  `key` ) \n' +
          ') ENGINE = INNODB;\n' +
          'START TRANSACTION;\n\n';
fs.writeSync(sqlOutput, sql);
log('done');

const etherpadDB = mysql.createConnection({
  host: settings.etherpadDB.host,
  user: settings.etherpadDB.user,
  password: settings.etherpadDB.password,
  database: settings.etherpadDB.database,
  port: settings.etherpadDB.port,
});

// get the timestamp once
const timestamp = Date.now();

let padIDs;

async.series([
  // get all padids out of the database...
  (callback) => {
    log('get all padIds out of the database...');

    etherpadDB.query('SELECT ID FROM PAD_META', [], (err, _padIDs) => {
      padIDs = _padIDs;
      callback(err);
    });
  },
  (callback) => {
    log('done');

    // create a queue with a concurrency 100
    const queue = async.queue((padId, callback) => {
      convertPad(padId, (err) => {
        incrementPadStats();
        callback(err);
      });
    }, 100);

    // set the step callback as the queue callback
    queue.drain = callback;

    // add the padids to the worker queue
    for (let i = 0, length = padIDs.length; i < length; i++) {
      queue.push(padIDs[i].ID);
    }
  },
], (err) => {
  if (err) throw err;

  // write the groups
  let sql = '';
  for (const proID of proID2groupID) {
    const groupID = proID2groupID[proID];
    const subdomain = proID2subdomain[proID];

    sql += `REPLACE INTO store VALUES (
      ${etherpadDB.escape(`group:${groupID}`)},
      ${etherpadDB.escape(JSON.stringify(groups[groupID]))});\n`;
    sql += `REPLACE INTO store VALUES (
      ${etherpadDB.escape(`mapper2group:subdomain:${subdomain}`)},
      ${etherpadDB.escape(groupID)});\n`;
  }

  // close transaction
  sql += 'COMMIT;';

  // end the sql file
  fs.writeSync(sqlOutput, sql, undefined, 'utf-8');
  fs.closeSync(sqlOutput);

  log('finished.');
  throw new Error();
});

const log = (str) => {
  console.log(`${(Date.now() - startTime) / 1000}\t${str}`);
};

let padsDone = 0;

const incrementPadStats = () => {
  padsDone++;

  if (padsDone % 100 === 0) {
    const averageTime = Math.round(padsDone / ((Date.now() - startTime) / 1000));
    log(`${padsDone}/${padIDs.length}\t${averageTime} pad/s`);
  }
};

const proID2groupID = {};
const proID2subdomain = {};
const groups = {};

const convertPad = (padId, callback) => {
  const changesets = [];
  const changesetsMeta = [];
  const chatMessages = [];
  const authors = [];
  let apool;
  let subdomain;
  let padmeta;

  async.series([
    // get all needed db values
    (callback) => {
      async.parallel([
        // get the pad revisions
        (callback) => {
          const sql = 'SELECT * FROM `PAD_CHAT_TEXT` WHERE NUMID = (SELECT `NUMID` FROM `PAD_CHAT_META` WHERE ID=?)';

          etherpadDB.query(sql, [padId], (err, results) => {
            if (!err) {
              try {
                // parse the pages
                for (let i = 0, length = results.length; i < length; i++) {
                  parsePage(
                      chatMessages, results[i].PAGESTART, results[i].OFFSETS, results[i].DATA, true
                  );
                }
              } catch (e) { err = e; }
            }

            callback(err);
          });
        },
        // get the chat entries
        (callback) => {
          const sql = 'SELECT * FROM `PAD_REVS_TEXT` WHERE NUMID = (SELECT `NUMID` FROM `PAD_REVS_META` WHERE ID=?)';

          etherpadDB.query(sql, [padId], (err, results) => {
            if (!err) {
              try {
                // parse the pages
                for (let i = 0, length = results.length; i < length; i++) {
                  parsePage(
                      changesets, results[i].PAGESTART, results[i].OFFSETS, results[i].DATA, false
                  );
                }
              } catch (e) { err = e; }
            }

            callback(err);
          });
        },
        // get the pad revisions meta data
        (callback) => {
          const sql = 'SELECT * FROM `PAD_REVMETA_TEXT` WHERE NUMID = (SELECT `NUMID` FROM `PAD_REVMETA_META` WHERE ID=?)';

          etherpadDB.query(sql, [padId], (err, results) => {
            if (!err) {
              try {
                // parse the pages
                for (let i = 0, length = results.length; i < length; i++) {
                  parsePage(changesetsMeta, results[i].PAGESTART, results[i].OFFSETS, results[i].DATA, true);
                }
              } catch (e) { err = e; }
            }

            callback(err);
          });
        },
        // get the attribute pool of this pad
        (callback) => {
          const sql = 'SELECT `JSON` FROM `PAD_APOOL` WHERE `ID` = ?';

          etherpadDB.query(sql, [padId], (err, results) => {
            if (!err) {
              try {
                apool = JSON.parse(results[0].JSON).x;
              } catch (e) { err = e; }
            }

            callback(err);
          });
        },
        // get the authors informations
        (callback) => {
          const sql = 'SELECT * FROM `PAD_AUTHORS_TEXT` WHERE NUMID = (SELECT `NUMID` FROM `PAD_AUTHORS_META` WHERE ID=?)';

          etherpadDB.query(sql, [padId], (err, results) => {
            if (!err) {
              try {
                // parse the pages
                for (let i = 0, length = results.length; i < length; i++) {
                  parsePage(authors, results[i].PAGESTART, results[i].OFFSETS, results[i].DATA, true);
                }
              } catch (e) { err = e; }
            }

            callback(err);
          });
        },
        // get the pad information
        (callback) => {
          const sql = 'SELECT JSON FROM `PAD_META` WHERE ID=?';

          etherpadDB.query(sql, [padId], (err, results) => {
            if (!err) {
              try {
                padmeta = JSON.parse(results[0].JSON).x;
              } catch (e) { err = e; }
            }

            callback(err);
          });
        },
        // get the subdomain
        (callback) => {
          // skip if this is no proPad
          if (padId.indexOf('$') === -1) {
            callback();
            return;
          }

          // get the proID out of this padID
          const proID = padId.split('$')[0];

          const sql = 'SELECT subDomain FROM pro_domains WHERE ID = ?';

          etherpadDB.query(sql, [proID], (err, results) => {
            if (!err) {
              subdomain = results[0].subDomain;
            }

            callback(err);
          });
        },
      ], callback);
    },
    (callback) => {
      // saves all values that should be written to the database
      const values = {};

      // this is a pro pad, let's convert it to a group pad
      if (padId.indexOf('$') !== -1) {
        const padIdParts = padId.split('$');
        const proID = padIdParts[0];
        const padName = padIdParts[1];

        let groupID;

        // this proID is not converted so far, do it
        if (proID2groupID[proID] == null) {
          groupID = `g.${randomString(16)}`;

          // create the mappers for this new group
          proID2groupID[proID] = groupID;
          proID2subdomain[proID] = subdomain;
          groups[groupID] = {pads: {}};
        }

        // use the generated groupID;
        groupID = proID2groupID[proID];

        // rename the pad
        padId = `${groupID}$${padName}`;

        // set the value for this pad in the group
        groups[groupID].pads[padId] = 1;
      }

      try {
        const newAuthorIDs = {};
        const oldName2newName = {};

        // replace the authors with generated authors
        // we need to do that cause where the original etherpad saves pad local authors, the new (lite) etherpad uses them global
        for (const i of apool.numToAttrib) {
          const key = apool.numToAttrib[i][0];
          const value = apool.numToAttrib[i][1];

          // skip non authors and anonymous authors
          if (key !== 'author' || value === '') continue;

          // generate new author values
          const authorID = `a.${randomString(16)}`;
          const authorColorID = authors[i].colorId ||
            Math.floor(Math.random() * (exports.getColorPalette().length));
          const authorName = authors[i].name || null;

          // overwrite the authorID of the attribute pool
          apool.numToAttrib[i][1] = authorID;

          // write the author to the database
          values[`globalAuthor:${authorID}`] = {
            colorId: authorColorID,
            name: authorName,
            timestamp,
          };

          // save in mappers
          newAuthorIDs[i] = authorID;
          oldName2newName[value] = authorID;
        }

        // save all revisions
        for (let i = 0; i < changesets.length; i++) {
          values[`pad:${padId}:revs:${i}`] = {changeset: changesets[i],
            meta: {
              author: newAuthorIDs[changesetsMeta[i].a],
              timestamp: changesetsMeta[i].t,
              atext: changesetsMeta[i].atext || undefined,
            }};
        }

        // save all chat messages
        for (let i = 0; i < chatMessages.length; i++) {
          values[`pad:${padId}:chat:${i}`] = {text: chatMessages[i].lineText,
            userId: oldName2newName[chatMessages[i].userId],
            time: chatMessages[i].time};
        }

        // generate the latest atext
        const fullAPool = (new AttributePool()).fromJsonable(apool);
        const keyRev = Math.floor(padmeta.head / padmeta.keyRevInterval) * padmeta.keyRevInterval;
        let atext = changesetsMeta[keyRev].atext;
        let curRev = keyRev;
        while (curRev < padmeta.head) {
          curRev++;
          const changeset = changesets[curRev];
          atext = Changeset.applyToAText(changeset, atext, fullAPool);
        }

        values[`pad:${padId}`] = {atext,
          pool: apool,
          head: padmeta.head,
          chatHead: padmeta.numChatMessages};
      } catch (e) {
        console.error(`Error while converting pad ${padId}, pad skipped`);
        console.error(e.stack ? e.stack : JSON.stringify(e));
        callback();
        return;
      }

      let sql = '';
      for (const key of values) {
        sql += `REPLACE INTO store VALUES (${etherpadDB.escape(key)}, ${etherpadDB.escape(JSON.stringify(values[key]))});\n`;
      }

      fs.writeSync(sqlOutput, sql, undefined, 'utf-8');
      callback();
    },
  ], callback);
};

/**
 * This parses a Page like Etherpad uses them in the databases
 * The offsets describes the length of a unit in the page, the data are
 * all values behind each other
 */
const parsePage = (array, pageStart, offsets, data, json) => {
  let start = 0;
  const lengths = offsets.split(',');

  for (let i = 0; i < lengths.length; i++) {
    let unitLength = lengths[i];

    // skip empty units
    if (unitLength === '') continue;

    // parse the number
    unitLength = Number(unitLength);

    // cut the unit out of data
    const unit = data.substr(start, unitLength);

    // put it into the array
    array[pageStart + i] = json ? JSON.parse(unit) : unit;

    // update start
    start += unitLength;
  }
};
